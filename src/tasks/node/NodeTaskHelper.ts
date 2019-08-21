import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DockerBuildOptions, DockerBuildTask } from '../DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTask } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NodeTaskOptions {
    foo?: string;
}

export type NodeTaskHelperType = TaskHelper<NodeTaskOptions, NodeTaskOptions>;

export class NodeTaskHelper implements NodeTaskHelperType {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        return await Promise.resolve([]);
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        return await Promise.resolve([]);
    }

    public async resolveDockerBuildTaskDefinition(buildOptions: DockerBuildOptions | undefined, helperOptions: NodeTaskOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions> {
        buildOptions = buildOptions || {};

        return await Promise.resolve(buildOptions);
    }

    public async resolveDockerRunTaskDefinition(runOptions: DockerBuildOptions | undefined, helperOptions: NodeTaskOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions> {
        runOptions = runOptions || {};

        return await Promise.resolve(runOptions);
    }
}
