import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DockerBuildTask, DockerBuildTaskDefinition, DockerBuildOptions } from '../DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition, DockerRunOptions } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NodeTaskOptions {
    foo?: string;
}

export class NodeTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        return await Promise.resolve([]);
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        return await Promise.resolve([]);
    }

    public async resolveDockerBuildTaskDefinition(definition: DockerBuildTaskDefinition, token?: CancellationToken): Promise<DockerBuildOptions> {
        const buildOptions = definition.dockerBuild || {};

        return await Promise.resolve(buildOptions);
    }

    public async resolveDockerRunTaskDefinition(definition: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunOptions> {
        const runOptions = definition.dockerRun || {};

        return await Promise.resolve(runOptions);
    }
}
