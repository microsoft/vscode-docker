import * as path from 'path';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DockerBuildOptions, DockerBuildTask } from '../DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTask } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NetCoreTaskOptions {
    appProject: string;
}

export type NetCoreTaskHelperType = TaskHelper<NetCoreTaskOptions, NetCoreTaskOptions>;

export class NetCoreTaskHelper implements NetCoreTaskHelperType {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        throw new Error('Method not implemented.');
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDockerBuildTaskDefinition(buildOptions: DockerBuildOptions | undefined, helperOptions: NetCoreTaskOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions> {
        buildOptions = buildOptions || {};

        buildOptions.dockerfile = buildOptions.dockerfile || path.join(path.dirname(helperOptions.appProject), 'Dockerfile');
        buildOptions.context = buildOptions.context || path.dirname(helperOptions.appProject);

        return buildOptions;
    }

    public async resolveDockerRunTaskDefinition(runOptions: DockerRunOptions | undefined, helperOptions: NetCoreTaskOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions> {
        throw new Error('Method not implemented.');
    }
}
