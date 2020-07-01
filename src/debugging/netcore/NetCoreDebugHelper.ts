/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { DebugConfiguration, MessageItem, window } from 'vscode';
import { DialogResponses, IActionContext, UserCancelledError } from 'vscode-azureextensionui';
import { DockerOSType } from '../../docker/Common';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { NetCoreTaskHelper, NetCoreTaskOptions } from '../../tasks/netcore/NetCoreTaskHelper';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';
import { LocalOSProvider } from '../../utils/LocalOSProvider';
import { getDockerOSType } from '../../utils/osUtils';
import { pathNormalize } from '../../utils/pathNormalize';
import { PlatformOS } from '../../utils/platform';
import { unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { ChildProcessProvider } from '../coreclr/ChildProcessProvider';
import { CliDockerClient } from '../coreclr/CliDockerClient';
import { CommandLineDotNetClient } from '../coreclr/CommandLineDotNetClient';
import { LocalFileSystemProvider } from '../coreclr/fsProvider';
import { AspNetCoreSslManager, LocalAspNetCoreSslManager } from '../coreclr/LocalAspNetCoreSslManager';
import { MsBuildNetCoreProjectProvider, NetCoreProjectProvider } from '../coreclr/netCoreProjectProvider';
import { DefaultOutputManager } from '../coreclr/outputManager';
import { OSTempFileProvider } from '../coreclr/tempFileProvider';
import { RemoteVsDbgClient, VsDbgClient } from '../coreclr/vsdbgClient';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, resolveDockerServerReadyAction } from '../DebugHelper';
import { DockerAttachConfiguration, DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

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
    private readonly netCoreProjectProvider: NetCoreProjectProvider;
    private readonly aspNetCoreSslManager: AspNetCoreSslManager;
    private readonly vsDbgClientFactory: () => VsDbgClient;
    private vsDbgClient: VsDbgClient;

    public constructor() {
        const processProvider = new ChildProcessProvider();
        const fsProvider = new LocalFileSystemProvider();
        const osProvider = new LocalOSProvider();

        const dotNetClient = new CommandLineDotNetClient(
            processProvider,
            fsProvider,
            osProvider
        );

        this.netCoreProjectProvider = new MsBuildNetCoreProjectProvider(
            fsProvider,
            dotNetClient,
            new OSTempFileProvider(osProvider, processProvider)
        );

        this.aspNetCoreSslManager = new LocalAspNetCoreSslManager(
            dotNetClient,
            this.netCoreProjectProvider,
            processProvider,
            osProvider
        );

        this.vsDbgClientFactory = () => {
            if (this.vsDbgClient === undefined) {
                this.vsDbgClient = new RemoteVsDbgClient(
                    new DefaultOutputManager(ext.outputChannel),
                    fsProvider,
                    ext.context.globalState,
                    osProvider,
                    processProvider
                );
            }

            return this.vsDbgClient;
        };
    }

    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NetCoreDebugScaffoldingOptions): Promise<DockerDebugConfiguration[]> {
        options = options || {};
        options.appProject = options.appProject || await NetCoreTaskHelper.inferAppProject(context.folder); // This method internally checks the user-defined input first

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
                return this.resolveLauchDebugConfiguration(context, debugConfiguration);
            case 'attach':
                return this.resolveAttachDebugConfiguration(context, debugConfiguration);
            default:
                throw Error(localize('vscode-docker.debug.netcore.unknownDebugRequest', 'Unknown request {0} specified in the debug config.', debugConfiguration.request));
        }
    }

    public async resolveLauchDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        debugConfiguration.netCore = debugConfiguration.netCore || {};
        debugConfiguration.netCore.appProject = await NetCoreTaskHelper.inferAppProject(context.folder, debugConfiguration.netCore); // This method internally checks the user-defined input first

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
            await this.configureSsl(debugConfiguration, appOutput);
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
                pattern: '^\\s*Now listening on:\\s+(https?://\\S+)',
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
                pipeProgram: 'docker',
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
                '/app/Views': path.join(path.dirname(debugConfiguration.netCore.appProject), 'Views'),
            }
        };
    }

    public async resolveAttachDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerAttachConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        // Get Container Name if missing
        const containerName: string = debugConfiguration.containerName ?? await this.getContainerNameToAttach(context.actionContext);

        let debuggerPath: string = debugConfiguration.netCore?.debuggerPath;

        // If debugger path is not specified, then install the debugger if it doesn't exist in the container
        if (!debuggerPath) {
            const containerOS = await getDockerOSType(context.actionContext);
            const osProvider = new LocalOSProvider();
            const debuggerDirectory = containerOS === 'windows' ? 'C:\\remote_debugger' : '/remote_debugger';
            debuggerPath = containerOS === 'windows'
                ? osProvider.pathJoin('Windows', debuggerDirectory, 'win7-x64', 'latest', 'vsdbg.exe')
                : osProvider.pathJoin('Linux', debuggerDirectory, 'vsdbg');
            const isDebuggerInstalled: boolean = await this.isDebuggerInstalled(containerName, debuggerPath, containerOS);
            if (!isDebuggerInstalled) {
                await this.copyDebuggerToContainer(context.actionContext, containerName, debuggerDirectory, containerOS);
            }
        }

        return {
            ...debugConfiguration, // Gets things like name, preLaunchTask, serverReadyAction, etc.
            type: 'coreclr',
            request: 'attach',
            'justMyCode': false,
            // if processId is specified in the debugConfiguration, then it will take precedences
            // and processName will be ignored.
            processName: debugConfiguration.processName || 'dotnet',
            pipeTransport: {
                pipeProgram: 'docker',
                pipeArgs: ['exec', '-i', containerName],
                // eslint-disable-next-line no-template-curly-in-string
                pipeCwd: '${workspaceFolder}',
                debuggerPath: debuggerPath,
                quoteArgs: false,
            },
            sourceFileMap: debugConfiguration.sourceFileMap || {
                // eslint-disable-next-line no-template-curly-in-string
                '/src': '${workspaceFolder}'
            }
        };
    }

    public static getHostDebuggerPathBase(): string {
        return path.join(os.homedir(), '.vsdbg');
    }

    private async inferAppOutput(helperOptions: NetCoreDebugOptions): Promise<string> {
        return await this.netCoreProjectProvider.getTargetPath(helperOptions.appProject);
    }

    private async loadExternalInfo(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const associatedTask = context.runDefinition;

        return {
            configureSsl: associatedTask && associatedTask.netCore && associatedTask.netCore.configureSsl !== undefined ? associatedTask.netCore.configureSsl : await NetCoreTaskHelper.inferSsl(context.folder, debugConfiguration.netCore),
            containerName: inferContainerName(debugConfiguration, context, context.folder.name),
            platformOS: associatedTask && associatedTask.dockerRun && associatedTask.dockerRun.os || 'Linux',
        }
    }

    private async acquireDebuggers(platformOS: PlatformOS): Promise<void> {
        if (platformOS === 'Windows') {
            await this.vsDbgClientFactory().getVsDbgVersion('latest', 'win7-x64');
        } else {
            await this.vsDbgClientFactory().getVsDbgVersion('latest', 'linux-x64');
            await this.vsDbgClientFactory().getVsDbgVersion('latest', 'linux-musl-x64');
        }

        const debuggerScriptPath = path.join(ext.context.asAbsolutePath('resources'), 'vsdbg');
        const destPath = path.join(NetCoreDebugHelper.getHostDebuggerPathBase(), 'vsdbg');
        await fse.copyFile(debuggerScriptPath, destPath);
        await fse.chmod(destPath, 0o755); // Give all read and execute permissions
    }

    private async configureSsl(debugConfiguration: DockerDebugConfiguration, appOutput: string): Promise<void> {
        const appOutputName = path.parse(appOutput).name;
        const certificateExportPath = path.join(LocalAspNetCoreSslManager.getHostSecretsFolders().certificateFolder, `${appOutputName}.pfx`);
        await this.aspNetCoreSslManager.trustCertificateIfNecessary();
        await this.aspNetCoreSslManager.exportCertificateIfNecessary(debugConfiguration.netCore.appProject, certificateExportPath);
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
        const relativePath = path.relative(path.dirname(debugConfiguration.netCore.appProject), appOutput);

        let result = platformOS === 'Windows' ?
            path.win32.join('C:\\app', relativePath) :
            path.posix.join('/app', relativePath);

        return pathNormalize(result, platformOS);
    }

    private async copyDebuggerToContainer(context: IActionContext, containerName: string, containerDebuggerDirectory: string, containerOS: DockerOSType): Promise<void> {
        const dockerClient = new CliDockerClient(new ChildProcessProvider());
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

        const hostDebuggerPath = await this.vsDbgClientFactory().getVsDbgFolder();
        const containerDebuggerPath = `${containerName}:${containerDebuggerDirectory}`;
        const outputManager = new DefaultOutputManager(ext.outputChannel);

        await outputManager.performOperation(
            localize('vscode-docker.debug.netcore.copyDebugger', 'Copying the .NET Core debugger to the container...'),
            async (output) => {
                await dockerClient.copy(hostDebuggerPath, containerDebuggerPath);
            },
            localize('vscode-docker.debug.netcore.debuggerInstalled', 'Debugger copied'),
            localize('vscode-docker.debug.netcore.unableToInstallDebugger', 'Unable to copy the .NET Core debugger.')
        );
    }

    private async isDebuggerInstalled(containerName: string, debuggerPath: string, containerOS: DockerOSType): Promise<boolean> {
        const dockerClient = new CliDockerClient(new ChildProcessProvider());
        const osProvider = new LocalOSProvider();
        let command: string;

        if (containerOS === 'windows') {
            command = `cmd /C "IF EXIST "${debuggerPath}" (echo true) else (echo false)"`;
        } else {
            command = osProvider.os === 'Windows' ?
                `/bin/sh -c "if [ -f ${debuggerPath} ]; then echo true; fi;"`
                : `/bin/sh -c 'if [ -f ${debuggerPath} ]; then echo true; fi;'`
        }
        const result: string = await dockerClient.exec(containerName, command, {});
        return result === 'true';
    }

    private async getContainerNameToAttach(context: IActionContext): Promise<string> {
        await ext.containersTree.refresh();
        const containerItem: ContainerTreeItem = await ext.containersTree.showTreeItemPicker(ContainerTreeItem.runningContainerRegExp, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.debug.netcore.noContainers', 'No running containers are available to attach.')
        });
        return containerItem.containerName;
    }
}

export const netCoreDebugHelper = new NetCoreDebugHelper();
