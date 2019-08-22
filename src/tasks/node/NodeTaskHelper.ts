import * as path from 'path';
import { CancellationToken, workspace, WorkspaceFolder } from 'vscode';
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

    public async resolveDockerBuildTaskDefinition(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: NodeTaskOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions> {
        if (buildOptions.tag === undefined) {
            const rootPath = workspace.workspaceFolders[0].uri.fsPath;
            const contextPath = path.join(rootPath, buildOptions.context);
            const contextBaseName = path.basename(contextPath);

            buildOptions.tag = `${contextBaseName}:latest`;
        }

        return await Promise.resolve(buildOptions);
    }

    public async resolveDockerRunTaskDefinition(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: NodeTaskOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions> {
        if (runOptions.image === undefined) {
            const rootPath = workspace.workspaceFolders[0].uri.fsPath;
            const rootPathBaseName = path.basename(rootPath);

            runOptions.image = `${rootPathBaseName}:latest`;
        }

        return await Promise.resolve(runOptions);
    }
}
