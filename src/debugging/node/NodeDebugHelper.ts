import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DebugHelper } from '../DebugHelper';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

export interface NodeDebugOptions {
    foo?: string;
}

export class NodeDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(): Promise<DockerDebugConfiguration[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration> {
        return await Promise.resolve({
            "type": "node2",
            "request": "attach",
            "name": "Docker: Attach to Node",
            "port": 9229,
            "localRoot": "${workspaceFolder}",
            "remoteRoot": "/usr/src/app",
            "trace": "all"
        });
    }
}
