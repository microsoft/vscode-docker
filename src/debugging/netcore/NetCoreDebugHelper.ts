import { CancellationToken, Memento, WorkspaceFolder } from 'vscode';
import { ext } from '../../extensionVariables';
import { PlatformOS } from '../../utils/platform';
import { ChildProcessProvider } from '../coreclr/ChildProcessProvider';
import { CliDockerClient } from '../coreclr/CliDockerClient';
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

export interface NetCoreDebugOptions {
    appProject?: string;
    appOutput?: string;
    os?: PlatformOS;
    containerName?: string;
}

export class NetCoreDebugHelper implements DebugHelper {
    private readonly netCoreProjectProvider: NetCoreProjectProvider;
    private readonly aspNetCoreSslManager: AspNetCoreSslManager;
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

        const dockerClient = new CliDockerClient(
            processProvider
        );

        this.debuggerClient = new DefaultDebuggerClient(
            dockerClient,
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

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration> {
        debugConfiguration.netCore = debugConfiguration.netCore || {};
        throw new Error('Method not implemented.');
    }

    private async acquireDebugger(helperOptions: NetCoreDebugOptions): Promise<string> {
        return await this.debuggerClient.getDebugger(helperOptions.os, helperOptions.containerName);
    }

    private async inferAppOutput(helperOptions: NetCoreDebugOptions): Promise<string> {
        return await this.netCoreProjectProvider.getTargetPath(helperOptions.appProject);
    }
}
