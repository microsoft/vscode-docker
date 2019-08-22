import { CancellationToken, ExtensionContext, tasks, WorkspaceFolder } from 'vscode';
import { DockerBuildOptions, DockerBuildTask, DockerBuildTaskProvider } from './DockerBuildTaskProvider';
import { DockerRunOptions, DockerRunTask, DockerRunTaskProvider } from './DockerRunTaskProvider';
import { NetCoreTaskHelper } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper } from './node/NodeTaskHelper';

export type TaskPlatform = 'netCore' | 'node';

export interface TaskHelper<THelperBuildOptions, THelperRunOptions> {
    provideDockerBuildTasks(folder: WorkspaceFolder): Promise<DockerBuildTask[]>;
    provideDockerRunTasks(folder: WorkspaceFolder): Promise<DockerRunTask[]>;
    resolveDockerBuildOptions(folder: WorkspaceFolder, buildOptions: DockerBuildOptions, helperOptions: THelperBuildOptions | undefined, token?: CancellationToken): Promise<DockerBuildOptions>;
    resolveDockerRunOptions(folder: WorkspaceFolder, runOptions: DockerRunOptions, helperOptions: THelperRunOptions | undefined, token?: CancellationToken): Promise<DockerRunOptions>;
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
