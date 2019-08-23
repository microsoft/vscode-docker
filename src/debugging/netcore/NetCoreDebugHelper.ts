import * as path from 'path';
import { CancellationToken, Memento, WorkspaceFolder } from 'vscode';
import { ext } from '../../extensionVariables';
import { NetCoreTaskHelper, NetCoreTaskOptions } from '../../tasks/netcore/NetCoreTaskHelper';
import { TaskCache } from '../../tasks/TaskHelper';
import { PlatformOS } from '../../utils/platform';
import { ChildProcessProvider } from '../coreclr/ChildProcessProvider';
import { CliDockerClient, DockerClient } from '../coreclr/CliDockerClient';
import { CommandLineDotNetClient } from '../coreclr/CommandLineDotNetClient';
import { DebuggerClient, DefaultDebuggerClient } from '../coreclr/debuggerClient';
import { LocalFileSystemProvider } from '../coreclr/fsProvider';
import { AspNetCoreSslManager, LocalAspNetCoreSslManager } from '../coreclr/LocalAspNetCoreSslManager';
import { LocalOSProvider } from '../coreclr/LocalOSProvider';
import { MsBuildNetCoreProjectProvider, NetCoreProjectProvider } from '../coreclr/netCoreProjectProvider';
import { DefaultOutputManager } from '../coreclr/outputManager';
import { OSTempFileProvider } from '../coreclr/tempFileProvider';
import { RemoteVsDbgClient } from '../coreclr/vsdbgClient';
import { DebugHelper } from '../DebugHelper';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

interface LaunchBrowserOptions {
    enabled?: boolean;
    command?: string;
    args?: string;
}

interface OsBrowserOptions extends LaunchBrowserOptions {
    windows?: LaunchBrowserOptions;
    osx?: LaunchBrowserOptions;
    linux?: LaunchBrowserOptions;
}

export type NetCoreDebugOptions = NetCoreTaskOptions & {
    appOutput?: string;
}

export class NetCoreDebugHelper implements DebugHelper {
    private readonly netCoreProjectProvider: NetCoreProjectProvider;
    private readonly aspNetCoreSslManager: AspNetCoreSslManager;
    private readonly dockerClient: DockerClient;
    private readonly debuggerClient: DebuggerClient;

    constructor(globalState: Memento) {
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

        this.dockerClient = new CliDockerClient(
            processProvider
        );

        this.debuggerClient = new DefaultDebuggerClient(
            this.dockerClient,
            osProvider,
            new RemoteVsDbgClient(
                new DefaultOutputManager(ext.outputChannel),
                fsProvider,
                globalState,
                osProvider,
                processProvider
            )
        );
    }

    public async provideDebugConfigurations(): Promise<DockerDebugConfiguration[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        debugConfiguration.netCore = debugConfiguration.netCore || {};
        debugConfiguration.netCore.appProject = await NetCoreTaskHelper.inferAppProject(folder, debugConfiguration.netCore);  // This method internally checks the user-defined input first

        const { configureSsl, containerName, os } = await this.loadInfoFromCache(folder, debugConfiguration);
        const appOutput = await this.inferAppOutput(debugConfiguration.netCore);
        if (token.isCancellationRequested) {
            return undefined;
        }

        const debuggerPath = await this.debuggerClient.getDebugger(os, containerName);
        if (token.isCancellationRequested) {
            return undefined;
        }

        if (configureSsl) {
            await this.configureSsl(debugConfiguration, appOutput);
            if (token.isCancellationRequested) {
                return undefined;
            }
        }

        const additionalProbingPathsArgs = NetCoreDebugHelper.getAdditionalProbingPathsArgs(os);

        const containerAppOutput = os === 'Windows'
            ? path.win32.join('C:\\app', appOutput)
            : path.posix.join('/app', appOutput);

        const { browserUrl, httpsPort } = await this.dockerClient.getContainerWebEndpoint(containerName);

        const programEnv = httpsPort ? { "ASPNETCORE_HTTPS_PORT": httpsPort } : {};

        return {
            name: debugConfiguration.name,
            type: 'coreclr',
            request: 'launch',
            program: debugConfiguration.program || 'dotnet',
            args: debugConfiguration.args || [additionalProbingPathsArgs, containerAppOutput].join(' '),
            cwd: debugConfiguration.cwd || os === 'Windows' ? 'C:\\app' : '/app',
            env: debugConfiguration.env || programEnv,
            launchBrowser: debugConfiguration.launchBrowser || NetCoreDebugHelper.inferLaunchBrowser(browserUrl),
            pipeTransport: {
                pipeProgram: 'docker',
                // tslint:disable: no-invalid-template-strings
                pipeArgs: ['exec', '-i', containerName, '${debuggerCommand}'],
                pipeCwd: '${workspaceFolder}',
                // tslint:enable: no-invalid-template-strings
                debuggerPath: os === 'Windows' ?
                    path.win32.join('C:\\remote_debugger', debuggerPath, 'vsdbg') :
                    path.posix.join('/remote_debugger', debuggerPath, 'vsdbg'),
                quoteArgs: false,
            },
            preLaunchTask: debugConfiguration.preLaunchTask,
            sourceFileMap: debugConfiguration.sourceFileMap || {
                '/app/Views': path.join(path.dirname(debugConfiguration.netCore.appProject), 'Views'),
            },
            platform: debugConfiguration.platform
        };
    }

    private async inferAppOutput(helperOptions: NetCoreDebugOptions): Promise<string> {
        return await this.netCoreProjectProvider.getTargetPath(helperOptions.appProject);
    }

    private async loadInfoFromCache(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, os: PlatformOS }> {
        const cache = TaskCache.get(debugConfiguration.netCore.appProject);

        // tslint:disable: no-string-literal no-unsafe-any
        const configureSsl = <boolean>(cache && cache['configureSsl']) || false;
        const containerName = <string>(cache && cache['containerName']) || `${await NetCoreTaskHelper.inferAppName(folder, debugConfiguration.netCore)}-dev`;
        const os = <PlatformOS>(cache && cache['os']) || 'Linux';
        // tslint:enable: no-string-literal no-unsafe-any

        return {
            configureSsl,
            containerName,
            os
        }
    }

    private async configureSsl(debugConfiguration: DockerDebugConfiguration, appOutput: string): Promise<void> {
        const appOutputName = path.parse(appOutput).name;
        const certificateExportPath = path.join(LocalAspNetCoreSslManager.getHostSecretsFolders().certificateFolder, `${appOutputName}.pfx`);
        await this.aspNetCoreSslManager.trustCertificateIfNecessary();
        await this.aspNetCoreSslManager.exportCertificateIfNecessary(debugConfiguration.netCore.appProject, certificateExportPath);
    }

    private static getAdditionalProbingPathsArgs(os: PlatformOS): string {
        const additionalProbingPaths = os === 'Windows'
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

    private static inferLaunchBrowser(browserUrl: string): OsBrowserOptions {
        return browserUrl
            ? {
                enabled: true,
                args: browserUrl,
                windows: {
                    command: 'cmd.exe',
                    args: `/C start ${browserUrl}`
                },
                osx: {
                    command: 'open'
                },
                linux: {
                    command: 'xdg-open'
                }
            }
            : {
                enabled: false
            };
    }
}
