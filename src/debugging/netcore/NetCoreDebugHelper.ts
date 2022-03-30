/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { DialogResponses, IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import { DebugConfiguration, MessageItem, ProgressLocation, window } from 'vscode';
import { DockerOSType } from '../../docker/Common';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { NetCoreTaskHelper, NetCoreTaskOptions } from '../../tasks/netcore/NetCoreTaskHelper';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { CommandLineBuilder } from '../../utils/commandLineBuilder';
import { getNetCoreProjectInfo } from '../../utils/netCoreUtils';
import { getDockerOSType, isArm64Mac } from '../../utils/osUtils';
import { pathNormalize } from '../../utils/pathNormalize';
import { PlatformOS } from '../../utils/platform';
import { unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { execAsync } from '../../utils/spawnAsync';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, ResolvedDebugConfiguration, inferContainerName, resolveDockerServerReadyAction } from '../DebugHelper';
import { DockerAttachConfiguration, DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';
import { exportCertificateIfNecessary, getHostSecretsFolders, trustCertificateIfNecessary } from './AspNetSslHelper';
import { VsDbgType, installDebuggersIfNecessary, vsDbgInstallBasePath } from './VsDbgHelper';

export interface NetCoreDebugOptions extends NetCoreTaskOptions {
    appOutput?: string;
    debuggerPath?: string;
}

export interface NetCoreDockerDebugConfiguration extends DebugConfiguration {
    netCore?: NetCoreDebugOptions;
}

export interface NetCoreDebugScaffoldingOptions {
    appProject?: string;
}

export class NetCoreDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<DockerDebugConfiguration[]> {
        options = options || {};
        options.appProject = options.appProject || await NetCoreTaskHelper.inferAppProject(context); // This method internally checks the user-defined input first

        return [
            {
                name: 'Docker .NET Core Launch',
                type: 'docker',
                request: 'launch',
                preLaunchTask: 'docker-run: debug',
                netCore: {
                    appProject: unresolveWorkspaceFolder(options.appProject, context.folder)
                }
            }
        ];
    }

    public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        switch (debugConfiguration.request) {
            case 'launch':
                return this.resolveLaunchDebugConfiguration(context, debugConfiguration);
            case 'attach':
                return this.resolveAttachDebugConfiguration(context, debugConfiguration);
            default:
                throw Error(localize('vscode-docker.debug.netcore.unknownDebugRequest', 'Unknown request {0} specified in the debug config.', debugConfiguration.request));
        }
    }

    private async resolveLaunchDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        debugConfiguration.netCore = debugConfiguration.netCore || {};
        debugConfiguration.netCore.appProject = await NetCoreTaskHelper.inferAppProject(context, debugConfiguration.netCore); // This method internally checks the user-defined input first

        const { configureSsl, containerName, platformOS } = await this.loadExternalInfo(context, debugConfiguration);
        const appOutput = await this.inferAppOutput(debugConfiguration.netCore);
        if (context.cancellationToken && context.cancellationToken.isCancellationRequested) {
            // inferAppOutput is slow, give a chance to cancel
            return undefined;
        }

        await this.acquireDebuggers(platformOS);
        if (context.cancellationToken && context.cancellationToken.isCancellationRequested) {
            // acquireDebuggers is slow, give a chance to cancel
            return undefined;
        }

        if (configureSsl) {
            await this.configureSsl(context.actionContext, debugConfiguration, appOutput);
            if (context.cancellationToken && context.cancellationToken.isCancellationRequested) {
                // configureSsl is slow, give a chance to cancel
                return undefined;
            }
        }

        const additionalProbingPathsArgs = NetCoreDebugHelper.getAdditionalProbingPathsArgs(platformOS);

        const containerAppOutput = NetCoreDebugHelper.getContainerAppOutput(debugConfiguration, appOutput, platformOS);

        const dockerServerReadyAction = resolveDockerServerReadyAction(
            debugConfiguration,
            {
                containerName: containerName,
                pattern: '\\bNow listening on:\\s+(https?://\\S+)',
                action: 'openExternally',
                uriFormat: '%s://localhost:%s',
            },
            configureSsl || await NetCoreTaskHelper.isWebApp(debugConfiguration.netCore.appProject) // For .NET Core Console we won't create a DockerServerReadyAction unless at least part of one is user-provided
        );

        return {
            ...debugConfiguration, // Gets things like name, preLaunchTask, serverReadyAction, etc.
            type: 'coreclr',
            request: 'launch',
            program: debugConfiguration.program || 'dotnet',
            args: debugConfiguration.args || [additionalProbingPathsArgs, containerAppOutput].join(' '),
            cwd: debugConfiguration.cwd || platformOS === 'Windows' ? 'C:\\app' : '/app',
            dockerOptions: {
                containerName: containerName,
                dockerServerReadyAction: dockerServerReadyAction,
                removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
            },
            pipeTransport: {
                pipeProgram: ext.dockerContextManager.getDockerCommand(context.actionContext),
                /* eslint-disable no-template-curly-in-string */
                pipeArgs: ['exec', '-i', containerName, '${debuggerCommand}'],
                pipeCwd: '${workspaceFolder}',
                /* eslint-enable no-template-curly-in-string */
                debuggerPath: platformOS === 'Windows' ?
                    'C:\\remote_debugger\\win7-x64\\latest\\vsdbg' :
                    '/remote_debugger/vsdbg',
                quoteArgs: false,
            },
            sourceFileMap: debugConfiguration.sourceFileMap || {
                // eslint-disable-next-line @typescript-eslint/naming-convention
                '/app/Views': path.join(path.dirname(debugConfiguration.netCore.appProject), 'Views'),
            }
        };
    }

    private async resolveAttachDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerAttachConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        // Get Container Name if missing
        const containerName: string = debugConfiguration.containerName ?? await this.getContainerNameToAttach(context.actionContext);

        let debuggerPath: string = debugConfiguration.netCore?.debuggerPath;

        // If debugger path is not specified, then install the debugger if it doesn't exist in the container
        if (!debuggerPath) {
            const containerOS = await getDockerOSType(context.actionContext);
            await this.acquireDebuggers(containerOS === 'windows' ? 'Windows' : 'Linux');
            const debuggerDirectory = containerOS === 'windows' ? 'C:\\remote_debugger' : '/remote_debugger';
            debuggerPath = containerOS === 'windows'
                ? path.win32.join(debuggerDirectory, 'win7-x64', 'latest', 'vsdbg.exe')
                : path.posix.join(debuggerDirectory, 'vsdbg');
            const isDebuggerInstalled: boolean = await this.isDebuggerInstalled(containerName, debuggerPath, containerOS);
            if (!isDebuggerInstalled) {
                await this.copyDebuggerToContainer(context.actionContext, containerName, debuggerDirectory, containerOS);
            }
        }

        return {
            ...debugConfiguration, // Gets things like name, preLaunchTask, serverReadyAction, etc.
            type: 'coreclr',
            request: 'attach',
            justMyCode: false,
            // if processId is specified in the debugConfiguration, then it will take precedence
            // and processName will be undefined.
            processName: debugConfiguration.processId ? undefined : debugConfiguration.processName || 'dotnet',
            pipeTransport: {
                pipeProgram: ext.dockerContextManager.getDockerCommand(context.actionContext),
                pipeArgs: ['exec', '-i', containerName],
                // eslint-disable-next-line no-template-curly-in-string
                pipeCwd: '${workspaceFolder}',
                debuggerPath: debuggerPath,
                quoteArgs: false,
            },
            sourceFileMap: debugConfiguration.sourceFileMap || {
                // eslint-disable-next-line no-template-curly-in-string, @typescript-eslint/naming-convention
                '/src': '${workspaceFolder}'
            }
        };
    }

    private async inferAppOutput(helperOptions: NetCoreDebugOptions): Promise<string> {
        const projectInfo = await getNetCoreProjectInfo('GetProjectProperties', helperOptions.appProject);
        if (projectInfo.length < 3) {
            throw new Error(localize('vscode-docker.debug.netcore.unknownOutputPath', 'Unable to determine assembly output path.'));
        }

        return projectInfo[2]; // First line is assembly name, second is target framework, third+ are output path(s)
    }

    private async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const associatedTask = context.runDefinition;

        return {
            configureSsl: !!(associatedTask?.netCore?.configureSsl),
            containerName: inferContainerName(debugConfiguration, context, context.folder.name),
            platformOS: associatedTask?.dockerRun?.os || 'Linux',
        };
    }

    private async acquireDebuggers(platformOS: PlatformOS): Promise<void> {
        await window.withProgress(
            {
                location: ProgressLocation.Notification,
                title: localize('vscode-docker.debug.netcore.acquiringDebuggers', 'Acquiring .NET Debugger...'),
            }, async () => {
                if (platformOS === 'Windows') {
                    await installDebuggersIfNecessary([{ runtime: 'win7-x64', version: 'latest' }]);
                } else {
                    const debuggers: VsDbgType[] = [
                        { runtime: 'linux-x64', version: 'latest' },
                        { runtime: 'linux-musl-x64', version: 'latest' },
                    ];

                    //
                    // NOTE: As OmniSharp doesn't yet support arm64 in general, we only install arm64 debuggers when
                    //       on an arm64 Mac (e.g. M1), even though there may be other platforms that could theoretically
                    //       run arm64 images. We are often asked to install the debugger before images are created or
                    //       pulled, which means we don't know a-priori the architecture of the image, so we install all
                    //       of them, just in case. Because we do not have a good way to distinguish between a Mac attached
                    //       to its local (Linux-based) Docker host (where arm64/amd64 are valid) or a Mac attached to a
                    //       remote (Linux-based) Docker host (where arm64 may *not* be valid), installing every debugger
                    //       is really our only choice.
                    //

                    if (isArm64Mac()) {
                        debuggers.push(
                            { runtime: 'linux-arm64', version: 'latest' },
                            { runtime: 'linux-musl-arm64', version: 'latest' });
                    }

                    await installDebuggersIfNecessary(debuggers);
                }
            }
        );

        const debuggerScriptPath = path.join(ext.context.asAbsolutePath('resources'), 'netCore', 'vsdbg');
        const destPath = path.join(vsDbgInstallBasePath, 'vsdbg');
        await fse.copyFile(debuggerScriptPath, destPath);
        await fse.chmod(destPath, 0o755); // Give all read and execute permissions
    }

    private async configureSsl(context: IActionContext, debugConfiguration: DockerDebugConfiguration, appOutput: string): Promise<void> {
        const appOutputName = path.parse(appOutput).name;
        const certificateExportPath = path.join(getHostSecretsFolders().hostCertificateFolder, `${appOutputName}.pfx`);
        await trustCertificateIfNecessary(context);
        await exportCertificateIfNecessary(debugConfiguration.netCore.appProject, certificateExportPath);
    }

    private static getAdditionalProbingPathsArgs(platformOS: PlatformOS): string {
        const additionalProbingPaths = platformOS === 'Windows'
            ? [
                'C:\\.nuget\\packages',
                'C:\\.nuget\\fallbackpackages'
            ]
            : [
                '/root/.nuget/packages',
                '/root/.nuget/fallbackpackages'
            ];
        return additionalProbingPaths.map(probingPath => `--additionalProbingPath ${probingPath}`).join(' ');
    }

    private static getContainerAppOutput(debugConfiguration: DockerDebugConfiguration, appOutput: string, platformOS: PlatformOS): string {
        const result = platformOS === 'Windows' ?
            path.win32.join('C:\\app', appOutput) :
            path.posix.join('/app', appOutput);

        return pathNormalize(result, platformOS);
    }

    private async copyDebuggerToContainer(context: IActionContext, containerName: string, containerDebuggerDirectory: string, containerOS: DockerOSType): Promise<void> {
        if (containerOS === 'windows') {
            const containerInfo = await ext.dockerClient.inspectContainer(context, containerName);
            if (containerInfo?.HostConfig?.Isolation === 'hyperv') {
                context.errorHandling.suppressReportIssue = true;
                throw new Error(localize('vscode-docker.debug.netcore.isolationNotSupported', 'Attaching a debugger to a Hyper-V container is not supported.'));
            }
        }

        const yesItem: MessageItem = DialogResponses.yes;
        const message = localize('vscode-docker.debug.netcore.attachingRequiresDebugger', 'Attaching to container requires .NET Core debugger in the container. Do you want to copy the debugger to the container?');
        const install = (yesItem === await window.showInformationMessage(message, ...[DialogResponses.yes, DialogResponses.no]));
        if (!install) {
            throw new UserCancelledError();
        }

        if (containerOS === 'windows') {
            await this.acquireDebuggers('Windows');
        } else {
            await this.acquireDebuggers('Linux');
        }

        const containerDebuggerPath = `${containerName}:${containerDebuggerDirectory}`;

        await window.withProgress({
            location: ProgressLocation.Notification,
            title: localize('vscode-docker.debug.netcore.copyDebugger', 'Copying the .NET Core debugger to the container ({0} --> {1})...', vsDbgInstallBasePath, containerDebuggerDirectory),
        }, async () => {
            const command = CommandLineBuilder
                .create(ext.dockerContextManager.getDockerCommand(context), 'cp')
                .withQuotedArg(vsDbgInstallBasePath)
                .withQuotedArg(containerDebuggerPath)
                .build();
            await execAsync(command);
        });
    }

    private async isDebuggerInstalled(containerName: string, debuggerPath: string, containerOS: DockerOSType): Promise<boolean> {
        const command = CommandLineBuilder
            .create(ext.dockerContextManager.getDockerCommand(), 'exec', '-i')
            .withQuotedArg(containerName)
            .withArg(containerOS === 'windows' ? 'cmd /C' : '/bin/sh -c')
            .withQuotedArg(containerOS === 'windows' ? `IF EXIST "${debuggerPath}" (echo true) else (echo false)` : `if [ -f ${debuggerPath} ]; then echo true; fi;`)
            .build();

        const { stdout } = await execAsync(command);

        return /true/ig.test(stdout);
    }

    private async getContainerNameToAttach(context: IActionContext): Promise<string> {
        await ext.containersTree.refresh(context);
        const containerItem: ContainerTreeItem = await ext.containersTree.showTreeItemPicker(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.debug.netcore.noContainers', 'No running containers are available to attach.')
        });
        return containerItem.containerName;
    }
}

export const netCoreDebugHelper = new NetCoreDebugHelper();
