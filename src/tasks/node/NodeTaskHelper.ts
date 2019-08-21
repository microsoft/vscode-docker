import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DockerBuildTask, DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NodeTaskOptions {
    foo?: string;
}

export class NodeTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        throw new Error('Method not implemented.');
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDockerBuildTaskDefinition(folder: WorkspaceFolder, definition: DockerBuildTaskDefinition, token?: CancellationToken): Promise<DockerBuildTaskDefinition> {
        throw new Error('Method not implemented.');
    }

    public async resolveDockerRunTaskDefinition(folder: WorkspaceFolder, definition: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunTaskDefinition> {
        throw new Error('Method not implemented.');
    }
}
