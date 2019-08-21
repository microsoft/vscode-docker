import * as path from 'path';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DockerBuildTask, DockerBuildTaskDefinition, DockerBuildOptions } from '../DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition, DockerRunOptions } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NetCoreTaskOptions {
    appProject: string;
}

export class NetCoreTaskHelper implements TaskHelper {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        throw new Error('Method not implemented.');
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDockerBuildTaskDefinition(definition: DockerBuildTaskDefinition, token?: CancellationToken): Promise<DockerBuildOptions> {
        const buildOptions = definition.dockerBuild || {};

        buildOptions.dockerfile = definition.dockerBuild.dockerfile || path.join(path.dirname(definition.netCore.appProject), 'Dockerfile');
        buildOptions.context = definition.dockerBuild.context || path.dirname(definition.netCore.appProject);

        return buildOptions;
    }

    public async resolveDockerRunTaskDefinition(definition: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunOptions> {
        throw new Error('Method not implemented.');
    }
}
