import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DebugHelper } from '../DebugHelper';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

export interface NetCoreDebugOptions {
    appProject: string;
}

export class NetCoreDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(): Promise<DockerDebugConfiguration[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration> {
        throw new Error('Method not implemented.');
    }
}
