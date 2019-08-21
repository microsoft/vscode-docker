import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { CommandLineBuilder } from '../debugging/coreclr/commandLineBuilder';
import { Platform } from '../utils/platform';
import { NetCoreTaskHelper, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper, NodeTaskOptions } from './node/NodeTaskHelper';

export interface DockerBuildOptions {
    args?: { [key: string]: string };
    context?: string;
    dockerfile?: string;
    labels?: { [key: string]: string };
    tag?: string;
    target?: string;
    pull?: boolean;
}

export interface DockerBuildTaskDefinition extends TaskDefinition {
    dockerBuild?: DockerBuildOptions;
    netCore?: NetCoreTaskOptions;
    node?: NodeTaskOptions;
}

export interface DockerBuildTask extends Task {
    definition: DockerBuildTaskDefinition;
}

export class DockerBuildTaskProvider implements TaskProvider {
    constructor(
        private readonly netCoreTaskHelper: NetCoreTaskHelper,
        private readonly nodeTaskHelper: NodeTaskHelper
    ) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: Task, token?: CancellationToken): ProviderResult<Task> {
        return callWithTelemetryAndErrorHandling(
            'docker-build',
            async () => await this.resolveTaskInternal(task, token));
    }

    public async initializeBuildTasks(folder: WorkspaceFolder, platform: Platform): Promise<void> {
        throw new Error("Method not implemented.");
    }

    private async resolveTaskInternal(task: DockerBuildTask, token?: CancellationToken): Promise<Task> {
        task.definition.dockerBuild = task.definition.dockerBuild || {};

        if (task.scope as WorkspaceFolder !== undefined) {
            if (task.definition.netCore) {
                task.definition = await this.netCoreTaskHelper.resolveDockerBuildTaskDefinition(task.scope as WorkspaceFolder, task.definition, token);
            } else if (task.definition.node) {
                task.definition = await this.nodeTaskHelper.resolveDockerBuildTaskDefinition(task.scope as WorkspaceFolder, task.definition, token);
            }
        } else {
            throw new Error(`Unable to determine task scope to execute docker-build task '${task.name}'.`);
        }

        return new Task(task.definition, task.scope, task.name, task.source, new ShellExecution(await this.resolveCommandLine(task, token)), task.problemMatchers);
    }

    private async resolveCommandLine(task: DockerBuildTask, token?: CancellationToken): Promise<string> {
        return CommandLineBuilder
            .create('docker', 'build', '--rm')
            .withFlagArg('--pull', task.definition.dockerBuild.pull)
            .withNamedArg('-f', task.definition.dockerBuild.dockerfile)
            .withKeyValueArgs('--build-arg', task.definition.dockerBuild.args)
            .withKeyValueArgs('--label', task.definition.dockerBuild.labels)
            .withNamedArg('-t', task.definition.dockerBuild.tag)
            .withNamedArg('--target', task.definition.dockerBuild.target)
            .withQuotedArg(task.definition.dockerBuild.context)
            .build();
    }
}
