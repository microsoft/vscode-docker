import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { Platform } from '../utils/platform';
import { NetCoreTaskHelperType, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskBuildOptions, NodeTaskHelperType } from './node/NodeTaskHelper';

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
    node?: NodeTaskBuildOptions;
}

export interface DockerBuildTask extends Task {
    definition: DockerBuildTaskDefinition;
}

export class DockerBuildTaskProvider implements TaskProvider {
    constructor(
        private readonly netCoreTaskHelper: NetCoreTaskHelperType,
        private readonly nodeTaskHelper: NodeTaskHelperType
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
        let buildOptions: DockerBuildOptions = task.definition.dockerBuild ? cloneObject(task.definition.dockerBuild) : {};

        if (buildOptions.context === undefined) {
            buildOptions.context = '.';
        }

        if (task.scope as WorkspaceFolder !== undefined) {
            if (task.definition.netCore) {
                buildOptions = await this.netCoreTaskHelper.resolveDockerBuildOptions(task.scope as WorkspaceFolder, buildOptions, task.definition.netCore, token);
            } else if (task.definition.node) {
                buildOptions = await this.nodeTaskHelper.resolveDockerBuildOptions(task.scope as WorkspaceFolder, buildOptions, task.definition.node, token);
            }
        } else {
            throw new Error(`Unable to determine task scope to execute docker-build task '${task.name}'.`);
        }

        return new Task(task.definition, task.scope, task.name, task.source, new ShellExecution(await this.resolveCommandLine(buildOptions, token)), task.problemMatchers);
    }

    private async resolveCommandLine(options: DockerBuildOptions, token?: CancellationToken): Promise<string> {
        return CommandLineBuilder
            .create('docker', 'build', '--rm')
            .withFlagArg('--pull', options.pull)
            .withNamedArg('-f', options.dockerfile)
            .withKeyValueArgs('--build-arg', options.args)
            .withKeyValueArgs('--label', options.labels)
            .withNamedArg('-t', options.tag)
            .withNamedArg('--target', options.target)
            .withQuotedArg(options.context)
            .build();
    }
}
