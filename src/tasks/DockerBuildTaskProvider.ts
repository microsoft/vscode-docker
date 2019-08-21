import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { CommandLineBuilder } from '../debugging/coreclr/commandLineBuilder';
import { Platform } from '../utils/platform';
import { NetCoreTaskHelperType, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelperType, NodeTaskOptions } from './node/NodeTaskHelper';

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
        let buildOptions: DockerBuildOptions;

        if (task.definition.netCore) {
            buildOptions = await this.netCoreTaskHelper.resolveDockerBuildTaskDefinition(task.definition.dockerBuild, task.definition.netCore, token);
        } else if (task.definition.node) {
            buildOptions = await this.nodeTaskHelper.resolveDockerBuildTaskDefinition(task.definition.dockerBuild, task.definition.node, token);
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
