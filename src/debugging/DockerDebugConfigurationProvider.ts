import { CancellationToken, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { Platform } from '../utils/platform';
import { NetCoreDebugHelper, NetCoreDebugOptions } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper, NodeDebugOptions } from './node/NodeDebugHelper';

export interface DockerDebugConfiguration extends DebugConfiguration {
    netCore?: NetCoreDebugOptions;
    node?: NodeDebugOptions;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    constructor(
        private readonly netCoreDebugHelper: NetCoreDebugHelper,
        private readonly nodeDebugHelper: NodeDebugHelper
    ) { }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return undefined;
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        return callWithTelemetryAndErrorHandling(
            'docker-launch',
            async () => await this.resolveDebugConfigurationInternal(folder, debugConfiguration, token));
    }

    public async initializeForDebugging(folder: WorkspaceFolder, platform: Platform | undefined): Promise<void> {
        throw new Error('Method not implemented');
    }

    private async resolveDebugConfigurationInternal(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        if (debugConfiguration.netCore) {
            return await this.netCoreDebugHelper.resolveDebugConfiguration(folder, debugConfiguration, token);
        } else if (debugConfiguration.node) {
            return await this.nodeDebugHelper.resolveDebugConfiguration(folder, debugConfiguration, token);
        }
    }
}
