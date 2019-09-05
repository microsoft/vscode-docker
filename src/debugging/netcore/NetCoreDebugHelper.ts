/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import { DebugConfiguration, WorkspaceFolder } from 'vscode';
import { ext } from '../../extensionVariables';
import { DockerRunTaskDefinition } from '../../tasks/DockerRunTaskProvider';
import { NetCoreTaskHelper, NetCoreTaskOptions } from '../../tasks/netcore/NetCoreTaskHelper';
import { getAssociatedDockerRunTask, unresolveWorkspaceFolderPath } from '../../tasks/TaskHelper';
import { PlatformOS } from '../../utils/platform';
import { ChildProcessProvider } from '../coreclr/ChildProcessProvider';
import { CommandLineDotNetClient } from '../coreclr/CommandLineDotNetClient';
import { LocalFileSystemProvider } from '../coreclr/fsProvider';
import { AspNetCoreSslManager, LocalAspNetCoreSslManager } from '../coreclr/LocalAspNetCoreSslManager';
import { LocalOSProvider } from '../coreclr/LocalOSProvider';
import { MsBuildNetCoreProjectProvider, NetCoreProjectProvider } from '../coreclr/netCoreProjectProvider';
import { DefaultOutputManager } from '../coreclr/outputManager';
import { OSTempFileProvider } from '../coreclr/tempFileProvider';
import { RemoteVsDbgClient, VsDbgClient } from '../coreclr/vsdbgClient';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, ResolvedDebugConfiguration } from '../DebugHelper';
import { DockerServerReadyAction } from '../DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

export interface NetCoreDebugOptions extends NetCoreTaskOptions {
    appOutput?: string;
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

    constructor() {
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
                type: 'docker-launch',
                request: 'launch',
                preLaunchTask: 'docker-run: debug',
                netCore: {
                    appProject: unresolveWorkspaceFolderPath(context.folder, options.appProject)
                }
            }
        ];
    }

    public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        debugConfiguration.netCore = debugConfiguration.netCore || {};
        debugConfiguration.netCore.appProject = await NetCoreTaskHelper.inferAppProject(context.folder, debugConfiguration.netCore); // This method internally checks the user-defined input first

        const { configureSsl, containerName, platformOS } = await this.loadExternalInfo(context.folder, debugConfiguration);
        const appOutput = await this.inferAppOutput(debugConfiguration.netCore);
        if (context.cancellationToken && context.cancellationToken.isCancellationRequested) {
            return undefined;
        }

        await this.acquireDebuggers(platformOS);
        if (context.cancellationToken && context.cancellationToken.isCancellationRequested) {
            return undefined;
        }

        if (configureSsl) {
            await this.configureSsl(debugConfiguration, appOutput);
            if (context.cancellationToken && context.cancellationToken.isCancellationRequested) {
                return undefined;
            }
        }

        const additionalProbingPathsArgs = NetCoreDebugHelper.getAdditionalProbingPathsArgs(platformOS);

        const containerAppOutput = NetCoreDebugHelper.getContainerAppOutput(debugConfiguration, appOutput, platformOS);

        const dockerServerReadyAction = await this.inferServerReadyAction(debugConfiguration, containerName, configureSsl);

        return {
            name: debugConfiguration.name,
            type: 'coreclr',
            request: 'launch',
            program: debugConfiguration.program || 'dotnet',
            args: debugConfiguration.args || [additionalProbingPathsArgs, containerAppOutput].join(' '),
            cwd: debugConfiguration.cwd || platformOS === 'Windows' ? 'C:\\app' : '/app',
            env: debugConfiguration.env,
            launchBrowser: debugConfiguration.launchBrowser,
            serverReadyAction: debugConfiguration.serverReadyAction,
            dockerOptions: {
                containerNameToKill: containerName,
                dockerServerReadyAction: dockerServerReadyAction,
                removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
            },
            pipeTransport: {
                pipeProgram: 'docker',
                // tslint:disable: no-invalid-template-strings
                pipeArgs: ['exec', '-i', containerName, '${debuggerCommand}'],
                pipeCwd: '${workspaceFolder}',
                // tslint:enable: no-invalid-template-strings
                debuggerPath: platformOS === 'Windows' ?
                    'C:\\remote_debugger\\win7-x64\\latest\\vsdbg' :
                    '/remote_debugger/vsdbg',
                quoteArgs: false,
            },
            preLaunchTask: debugConfiguration.preLaunchTask,
            sourceFileMap: debugConfiguration.sourceFileMap || {
                '/app/Views': path.join(path.dirname(debugConfiguration.netCore.appProject), 'Views'),
            }
        };
    }

    public static getHostDebuggerPathBase(): string {
        return path.join(os.homedir(), '.vsdbg');
    }

    private async inferAppOutput(helperOptions: NetCoreDebugOptions): Promise<string> {
        return await this.netCoreProjectProvider.getTargetPath(helperOptions.appProject);
    }

    private async loadExternalInfo(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        const associatedTask: DockerRunTaskDefinition = await getAssociatedDockerRunTask(debugConfiguration) || { type: 'docker-run' };

        return {
            configureSsl: associatedTask.netCore && associatedTask.netCore.configureSsl !== undefined ? associatedTask.netCore.configureSsl : await NetCoreTaskHelper.inferSsl(folder, debugConfiguration.netCore),
            containerName: associatedTask.dockerRun && associatedTask.dockerRun.containerName || await NetCoreTaskHelper.getContainerName(debugConfiguration.netCore.appProject),
            platformOS: associatedTask.dockerRun && associatedTask.dockerRun.os || 'Linux',
        }
    }

    private async acquireDebuggers(platformOS: PlatformOS): Promise<void> {
        if (platformOS === 'Windows') {
            await this.vsDbgClientFactory().getVsDbgVersion('latest', 'win7-x64');
        } else {
            await this.vsDbgClientFactory().getVsDbgVersion('latest', 'linux-x64');
            await this.vsDbgClientFactory().getVsDbgVersion('latest', 'linux-musl-x64');
        }

        const debuggerScriptPath = path.join(ext.context.asAbsolutePath('src/debugging/netcore'), 'vsdbg');
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

    private async inferServerReadyAction(debugConfiguration: DockerDebugConfiguration, containerName: string, configureSsl: boolean): Promise<DockerServerReadyAction> {
        const numBrowserOptions = [debugConfiguration.launchBrowser, debugConfiguration.serverReadyAction, debugConfiguration.dockerServerReadyAction].filter(property => property !== undefined).length;

        if (numBrowserOptions > 1) {
            throw new Error(`Only one of the 'launchBrowser', 'serverReadyAction', and 'dockerServerReadyAction' properties may be set at a time.`);
        }

        const dockerServerReadyAction: DockerServerReadyAction = numBrowserOptions === 1
            ? debugConfiguration.dockerServerReadyAction // If they specified any browser option, take their input as the result
            : configureSsl || (await this.isWebApp(debugConfiguration)) ? // If this is indeed a web app, and they didn't specify a browser option, infer a default one
                {
                    containerName: containerName,
                    pattern: '^\\s*Now listening on:\\s+(https?://\\S+)'
                }
                : undefined; // If this is not a web app, infer nothing

        if (dockerServerReadyAction) { // If we have something for dockerServerReadyAction, resolve the container name and URI format if needed
            dockerServerReadyAction.containerName = dockerServerReadyAction.containerName || containerName;
            dockerServerReadyAction.uriFormat = dockerServerReadyAction.uriFormat || '%s://localhost:%s';
        }

        return dockerServerReadyAction;
    }

    private async isWebApp(debugConfiguration: DockerDebugConfiguration): Promise<boolean> {
        const projectContents = await fse.readFile(debugConfiguration.netCore.appProject);

        return /Microsoft\.NET\.Sdk\.Web/i.test(projectContents.toString());
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

        return platformOS === 'Windows' ?
            path.win32.normalize(path.win32.join('C:\\app', relativePath)).replace(/\//g, '\\') :
            path.posix.normalize(path.posix.join('/app', relativePath)).replace(/\\/g, '/');
    }
}

const netCoreDebugHelper = new NetCoreDebugHelper();

export default netCoreDebugHelper;
