import * as path from 'path';
import { CancellationToken, WorkspaceFolder } from 'vscode';
import { DockerBuildTask, DockerBuildTaskDefinition } from '../DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition } from '../DockerRunTaskProvider';
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

    public async resolveDockerBuildTaskDefinition(folder: WorkspaceFolder, definition: DockerBuildTaskDefinition, token?: CancellationToken): Promise<DockerBuildTaskDefinition> {
        definition.dockerBuild.dockerfile = definition.dockerBuild.dockerfile || path.join(path.dirname(definition.netCore.appProject), 'Dockerfile');
        definition.dockerBuild.context = definition.dockerBuild.context || path.dirname(definition.netCore.appProject);

        return definition;
    }

    public async resolveDockerRunTaskDefinition(folder: WorkspaceFolder, definition: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunTaskDefinition> {
        throw new Error('Method not implemented.');
    }
}
