import { CancellationToken, debug, ExtensionContext, WorkspaceFolder } from 'vscode';
import { DockerDebugConfiguration, DockerDebugConfigurationProvider } from './DockerDebugConfigurationProvider';
import { NetCoreDebugHelper } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper } from './node/NodeDebugHelper';

export interface DebugHelper {
    provideDebugConfigurations(): Promise<DockerDebugConfiguration[]>;
    resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration>;
}

export function registerDebugProvider(ctx: ExtensionContext): void {
    ctx.subscriptions.push(
        debug.registerDebugConfigurationProvider(
            'docker-launch',
            new DockerDebugConfigurationProvider(
                new NetCoreDebugHelper(),
                new NodeDebugHelper()
            )
        )
    );
}
