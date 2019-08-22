import * as path from 'path';
import { CancellationToken, workspace, WorkspaceFolder } from 'vscode';
import { DockerBuildOptions, DockerBuildTask } from '../DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTask } from '../DockerRunTaskProvider';
import { TaskHelper } from '../TaskHelper';

export interface NodeTaskBuildOptions {
    foo?: string;
}

export interface NodeTaskRunOptions {
    enableDebugging?: boolean;
    inspectMode?: 'default' | 'break';
    inspectPort?: number;
}

export type NodeTaskHelperType = TaskHelper<NodeTaskBuildOptions, NodeTaskRunOptions>;

export class NodeTaskHelper implements NodeTaskHelperType {
    public async provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]> {
        return await Promise.resolve([]);
    }

    public async provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]> {
        return await Promise.resolve([]);
    }

    public async resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: NodeTaskBuildOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions> {
        if (buildOptions.tag === undefined) {
            const rootPath = workspace.workspaceFolders[0].uri.fsPath;
            const contextPath = path.join(rootPath, buildOptions.context);
            const contextBaseName = path.basename(contextPath);

            buildOptions.tag = `${contextBaseName}:latest`;
        }

        return await Promise.resolve(buildOptions);
    }

    public async resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: NodeTaskRunOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions> {
        if (runOptions.image === undefined) {
            const rootPath = workspace.workspaceFolders[0].uri.fsPath;
            const rootPathBaseName = path.basename(rootPath);

            runOptions.image = `${rootPathBaseName}:latest`;
        }

        if (helperOptions && helperOptions.enableDebugging) {
            if (runOptions.command !== undefined) {
                throw new Error('Debugging cannot be enabled when the Docker run command has been overridden.');
            }

            const inspectMode = helperOptions.inspectMode || 'default';
            const inspectArg = inspectMode === 'break' ? '--inspect-brk' : '--inspect';
            const inspectPort = helperOptions.inspectPort !== undefined ? helperOptions.inspectPort : 9229;

            // TODO: Infer startup script...
            runOptions.command = `node ${inspectArg}=0.0.0.0:${inspectPort} ./bin/www`;

            if (runOptions.ports === undefined) {
                runOptions.ports = [];
            }

            // If not already defined, create a mapping for the inspect port between container and host...
            if (runOptions.ports.find(port => port.containerPort === inspectPort) === undefined) {
                runOptions.ports.push({
                    containerPort: inspectPort,
                    // TODO: Can this mapping be dynamic?
                    hostPort: inspectPort
                });
            }
        }

        return await Promise.resolve(runOptions);
    }
}
