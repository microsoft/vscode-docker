import { CancellationToken, ExtensionContext, tasks, WorkspaceFolder } from 'vscode';
import { DockerBuildTask, DockerBuildTaskDefinition, DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerRunTask, DockerRunTaskDefinition, DockerRunTaskProvider } from './DockerRunTaskProvider';
import { NetCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper } from './node/NodeTaskHelper';

export interface TaskHelper {
    provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]>;
    provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]>;
    resolveDockerBuildTaskDefinition(folder: WorkspaceFolder, buildTask: DockerBuildTaskDefinition, token?: CancellationToken): Promise<DockerBuildTaskDefinition>;
    resolveDockerRunTaskDefinition(folder: WorkspaceFolder, runTask: DockerRunTaskDefinition, token?: CancellationToken): Promise<DockerRunTaskDefinition>;
}

export function registerTaskProviders(ctx: ExtensionContext): void {
    const netCoreTaskHelper = new NetCoreTaskHelper();
    const nodeTaskHelper = new NodeTaskHelper();

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-build',
            new DockerBuildTaskProvider(
                netCoreTaskHelper,
                nodeTaskHelper
            )
        )
    );

    ctx.subscriptions.push(
        tasks.registerTaskProvider(
            'docker-run',
            new DockerRunTaskProvider(
                netCoreTaskHelper,
                nodeTaskHelper
            )
        )
    );
}
