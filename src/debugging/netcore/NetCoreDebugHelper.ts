import * as os from 'os';
import * as path from 'path';
import { CancellationToken, Memento, tasks, WorkspaceFolder } from 'vscode';
import { ext } from '../../extensionVariables';
import { DockerRunTask, DockerRunTaskDefinition } from '../../tasks/DockerRunTaskProvider';
import { NetCoreTaskHelper, NetCoreTaskOptions } from '../../tasks/netcore/NetCoreTaskHelper';
import { PlatformOS } from '../../utils/platform';
import { ChildProcessProvider } from '../coreclr/ChildProcessProvider';
import { CliDockerClient, DockerClient } from '../coreclr/CliDockerClient';
import { CommandLineDotNetClient } from '../coreclr/CommandLineDotNetClient';
import { LocalFileSystemProvider } from '../coreclr/fsProvider';
import { AspNetCoreSslManager, LocalAspNetCoreSslManager } from '../coreclr/LocalAspNetCoreSslManager';
import { LocalOSProvider } from '../coreclr/LocalOSProvider';
import { MsBuildNetCoreProjectProvider, NetCoreProjectProvider } from '../coreclr/netCoreProjectProvider';
import { DefaultOutputManager } from '../coreclr/outputManager';
import { OSTempFileProvider } from '../coreclr/tempFileProvider';
import { RemoteVsDbgClient, VsDbgClient } from '../coreclr/vsdbgClient';
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
    vsdbgRuntime?: 'linux-x64' | 'linux-musl-x64' | 'win7-x64';
    vsdbgVersion?: 'latest' | 'vs2019' | 'vs2017u5';
}

export class NetCoreDebugHelper implements DebugHelper {
    private readonly netCoreProjectProvider: NetCoreProjectProvider;
    private readonly aspNetCoreSslManager: AspNetCoreSslManager;
    private readonly dockerClient: DockerClient;
    private readonly vsDbgClient: VsDbgClient;

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

        this.vsDbgClient = new RemoteVsDbgClient(
            new DefaultOutputManager(ext.outputChannel),
            fsProvider,
            globalState,
            osProvider,
            processProvider
        );
    }

    public async provideDebugConfigurations(): Promise<DockerDebugConfiguration[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        debugConfiguration.netCore = debugConfiguration.netCore || {};
        debugConfiguration.netCore.appProject = await NetCoreTaskHelper.inferAppProject(folder, debugConfiguration.netCore);  // This method internally checks the user-defined input first

        const { configureSsl, containerName, platformOS } = await this.loadExternalInfo(folder, debugConfiguration);
        const appOutput = await this.inferAppOutput(debugConfiguration.netCore);
        if (token.isCancellationRequested) {
            return undefined;
        }

        const debuggerPath = await this.acquireDebugger(debugConfiguration, platformOS);
        if (token.isCancellationRequested) {
            return undefined;
        }

        if (configureSsl) {
            await this.configureSsl(debugConfiguration, appOutput);
            if (token.isCancellationRequested) {
                return undefined;
            }
        }

        const additionalProbingPathsArgs = NetCoreDebugHelper.getAdditionalProbingPathsArgs(platformOS);

        const containerAppOutput = NetCoreDebugHelper.getContainerAppOutput(debugConfiguration, appOutput, platformOS);

        // TODO The container isn't running...how can we get the launch target?
        //const { browserUrl, httpsPort } = await this.dockerClient.getContainerWebEndpoint(containerName);
        const { browserUrl, httpsPort } = { browserUrl: 'http://localhost', httpsPort: undefined };

        const programEnv = httpsPort ? { "ASPNETCORE_HTTPS_PORT": httpsPort } : {};

        return {
            name: debugConfiguration.name,
            type: 'coreclr',
            request: 'launch',
            program: debugConfiguration.program || 'dotnet',
            args: debugConfiguration.args || [additionalProbingPathsArgs, containerAppOutput].join(' '),
            cwd: debugConfiguration.cwd || platformOS === 'Windows' ? 'C:\\app' : '/app',
            env: debugConfiguration.env || programEnv,
            launchBrowser: debugConfiguration.launchBrowser || NetCoreDebugHelper.inferLaunchBrowser(browserUrl),
            pipeTransport: {
                pipeProgram: 'docker',
                // tslint:disable: no-invalid-template-strings
                pipeArgs: ['exec', '-i', containerName, '${debuggerCommand}'],
                pipeCwd: '${workspaceFolder}',
                // tslint:enable: no-invalid-template-strings
                debuggerPath: platformOS === 'Windows' ?
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

    public static getHostDebuggerPathBase(): string {
        return path.join(os.homedir(), '.vsdbg');
    }

    private async inferAppOutput(helperOptions: NetCoreDebugOptions): Promise<string> {
        return await this.netCoreProjectProvider.getTargetPath(helperOptions.appProject);
    }

    private async loadExternalInfo(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration): Promise<{ configureSsl: boolean, containerName: string, platformOS: PlatformOS }> {
        let associatedTask: DockerRunTask;
        const dockerRunTasks = (await tasks.fetchTasks({ "type": "docker-run" })).map(t => t as DockerRunTask);

        if (dockerRunTasks.length === 1) {
            associatedTask = dockerRunTasks[0];
        } else if (dockerRunTasks.length > 1) {
            associatedTask = dockerRunTasks.find(task => {
                let taskAppProject: string = task.definition && task.definition.netCore && task.definition.netCore.appProject || undefined;
                if (!taskAppProject) {
                    return false;
                }

                taskAppProject = NetCoreTaskHelper.resolveWorkspaceFolderPath(folder, taskAppProject);

                return taskAppProject === debugConfiguration.netCore.appProject;
            });
        }

        if (!associatedTask) {
            throw new Error('Unable to find docker-run task associated with this project. Please make sure a docker-run task is defined for this project.');
        }

        const definition = (associatedTask.definition || {}) as DockerRunTaskDefinition;

        return {
            configureSsl: definition.netCore && definition.netCore.configureSsl || await NetCoreTaskHelper.inferSsl(folder, debugConfiguration.netCore),
            containerName: definition.dockerRun && definition.dockerRun.containerName || `${await NetCoreTaskHelper.inferAppName(folder, debugConfiguration.netCore)}-dev`,
            platformOS: definition.dockerRun && definition.dockerRun.os || 'Linux',
        }
    }

    private async acquireDebugger(debugConfiguration: DockerDebugConfiguration, platformOS: PlatformOS): Promise<string> {
        const debuggerPath = await this.vsDbgClient.getVsDbgVersion(
            debugConfiguration.netCore.vsdbgVersion || 'latest',
            debugConfiguration.netCore.vsdbgRuntime || 'linux-x64');
        return NetCoreDebugHelper.fullNormalize(debuggerPath, platformOS);
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

        return platformOS === 'Windows'
            ? NetCoreDebugHelper.fullNormalize(path.win32.join('C:\\app', relativePath), platformOS)
            : NetCoreDebugHelper.fullNormalize(path.posix.join('/app', relativePath), platformOS);
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

    private static fullNormalize(oldPath: string, platformOS?: PlatformOS): string {
        if (!platformOS) {
            return path.normalize(oldPath);
        } else {
            oldPath = oldPath.replace(
                platformOS === 'Windows' ? /\//g : /\\/g,
                platformOS === 'Windows' ? '\\' : '/'
            );

            return platformOS === 'Windows' ? path.win32.normalize(oldPath) : path.posix.normalize(oldPath);
        }
    }
}
