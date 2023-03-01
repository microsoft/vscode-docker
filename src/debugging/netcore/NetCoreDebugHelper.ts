/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as path from 'path';
import { DebugConfiguration, l10n, MessageItem, ProgressLocation, window } from 'vscode';
import { ext } from '../../extensionVariables';
import { CommandLineArgs, composeArgs, ContainerOS, VoidCommandResponse, withArg, withQuotedArg } from '../../runtimes/docker';
import { NetCoreTaskHelper, NetCoreTaskOptions } from '../../tasks/netcore/NetCoreTaskHelper';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { getNetCoreProjectInfo } from '../../utils/netCoreUtils';
import { getDockerOSType, isArm64Mac } from '../../utils/osUtils';
import { pathNormalize } from '../../utils/pathNormalize';
import { PlatformOS } from '../../utils/platform';
import { unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, resolveDockerServerReadyAction } from '../DebugHelper';
import { DockerAttachConfiguration, DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';
import { exportCertificateIfNecessary, getHostSecretsFolders, trustCertificateIfNecessary } from './AspNetSslHelper';
import { installDebuggersIfNecessary, vsDbgInstallBasePath, VsDbgType } from './VsDbgHelper';

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
                name: 'Docker .NET Launch',
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
                throw Error(l10n.t('Unknown request {0} specified in the debug config.', debugConfiguration.request));
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
            configureSsl || await NetCoreTaskHelper.isWebApp(debugConfiguration.netCore.appProject) // For .NET Console we won't create a DockerServerReadyAction unless at least part of one is user-provided
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
                pipeProgram: await ext.runtimeManager.getCommand(),
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
            const containerOS = await getDockerOSType();
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
                pipeProgram: await ext.runtimeManager.getCommand(),
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
            throw new Error(l10n.t('Unable to determine assembly output path.'));
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
                title: l10n.t('Acquiring .NET Debugger...'),
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

    private async copyDebuggerToContainer(context: IActionContext, containerName: string, containerDebuggerDirectory: string, containerOS: ContainerOS): Promise<void> {
        if (containerOS === 'windows') {
            const inspectInfo = (await ext.runWithDefaults(client =>
                client.inspectContainers({ containers: [containerName] })
            ))?.[0];
            const containerInfo = inspectInfo ? JSON.parse(inspectInfo.raw) : undefined;
            if (containerInfo?.HostConfig?.Isolation === 'hyperv') {
                context.errorHandling.suppressReportIssue = true;
                throw new Error(l10n.t('Attaching a debugger to a Hyper-V container is not supported.'));
            }
        }

        const yesItem: MessageItem = DialogResponses.yes;
        const message = l10n.t('Attaching to container requires .NET debugger in the container. Do you want to copy the debugger to the container?');
        const install = (yesItem === await window.showInformationMessage(message, ...[DialogResponses.yes, DialogResponses.no]));
        if (!install) {
            throw new UserCancelledError();
        }

        if (containerOS === 'windows') {
            await this.acquireDebuggers('Windows');
        } else {
            await this.acquireDebuggers('Linux');
        }

        await window.withProgress({
            location: ProgressLocation.Notification,
            title: l10n.t('Copying the .NET debugger to the container ({0} --> {1})...', vsDbgInstallBasePath, containerDebuggerDirectory),
        }, async () => {
            await ext.runWithDefaults(client =>
                client.writeFile({
                    container: containerName,
                    inputFile: vsDbgInstallBasePath,
                    path: containerDebuggerDirectory,
                })
            );
        });
    }

    private async isDebuggerInstalled(containerName: string, debuggerPath: string, containerOS: ContainerOS): Promise<boolean> {
        let containerCommand: string;
        let containerCommandArgs: CommandLineArgs;
        if (containerOS === 'windows') {
            containerCommand = 'cmd';
            containerCommandArgs = composeArgs(
                withArg('/C'),
                withQuotedArg(`IF EXIST "${debuggerPath}" (exit 0) else (exit 1)`)
            )();
        } else {
            containerCommand = '/bin/sh';
            containerCommandArgs = composeArgs(
                withArg('-c'),
                withQuotedArg(`if [ -f ${debuggerPath} ]; then exit 0; else exit 1; fi;`)
            )();
        }

        try {
            await ext.runWithDefaults(client =>
                // Since we're not interested in the output, just the exit code, we can pretend this is a `VoidCommandResponse`
                client.execContainer({
                    container: containerName,
                    command: [containerCommand, ...containerCommandArgs],
                    interactive: true,
                }) as Promise<VoidCommandResponse>
            );
            return true;
        } catch {
            return false;
        }
    }

    private async getContainerNameToAttach(context: IActionContext): Promise<string> {
        await ext.containersTree.refresh(context);
        const containerItem: ContainerTreeItem = await ext.containersTree.showTreeItemPicker(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No running containers are available to attach.')
        });
        return containerItem.containerName;
    }
}

export const netCoreDebugHelper = new NetCoreDebugHelper();
