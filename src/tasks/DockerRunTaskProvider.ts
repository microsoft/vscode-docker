import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { CommandLineBuilder } from '../debugging/coreclr/commandLineBuilder';
import { Platform, PlatformOS } from '../utils/platform';
import { NetCoreTaskHelper, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper, NodeTaskOptions } from './node/NodeTaskHelper';
import { TaskHelper } from './TaskHelper';

export interface DockerContainerExtraHost {
    hostname: string;
    ip: string;
}

export interface DockerContainerPort {
    hostPort?: string;
    containerPort: string;
    protocol?: 'tcp' | 'udp';
}

export interface DockerContainerVolume {
    localPath: string;
    containerPath: string;
    permissions?: 'ro' | 'rw';
}

export interface DockerRunOptions {
    command?: string;
    containerName?: string;
    entrypoint?: string;
    env?: { [key: string]: string };
    envFiles?: string[];
    extraHosts?: DockerContainerExtraHost[];
    labels?: { [key: string]: string };
    network?: string;
    networkAlias?: string;
    os?: PlatformOS;
    ports?: DockerContainerPort[];
    volumes?: DockerContainerVolume[];
}

export interface DockerRunTaskDefinition extends TaskDefinition {
    dockerRun?: DockerRunOptions;
    netCore?: NetCoreTaskOptions;
    node?: NodeTaskOptions;
}

export interface DockerRunTask extends Task {
    definition: DockerRunTaskDefinition;
}

export class DockerRunTaskProvider implements TaskProvider {
    constructor(
        private readonly netCoreTaskHelper: TaskHelper,
        private readonly nodeTaskHelper: TaskHelper
    ) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: Task, token?: CancellationToken): ProviderResult<Task> {
        return callWithTelemetryAndErrorHandling(
            'docker-run',
            async () => await this.resolveTaskInternal(task, token));
    }

    public async initializeRunTasks(folder: WorkspaceFolder, platform: Platform): Promise<void> {
        throw new Error('Method not implemented.');
    }

    private async resolveTaskInternal(task: DockerRunTask, token?: CancellationToken): Promise<Task> {
        let runOptions: DockerRunOptions;

        if (task.definition.netCore) {
            runOptions = await this.netCoreTaskHelper.resolveDockerRunTaskDefinition(task.definition, token);
        } else if (task.definition.node) {
            runOptions = await this.nodeTaskHelper.resolveDockerRunTaskDefinition(task.definition, token);
        }

        return new Task(task.definition, task.scope, task.name, task.source, new ShellExecution(await this.resolveCommandLine(runOptions, token)), task.problemMatchers);
    }

    private async resolveCommandLine(runOptions: DockerRunOptions, token?: CancellationToken): Promise<string> {
        return CommandLineBuilder
            .create('docker', 'run', '-dt')
            .withFlagArg('-P', runOptions.ports === undefined || runOptions.ports.length < 1)
            .withNamedArg('--name', runOptions.containerName)
            .withNamedArg('--network', runOptions.network)
            .withNamedArg('--network-alias', runOptions.networkAlias)
            .withKeyValueArgs('-e', runOptions.env)
            .withArrayArgs('--env-file', runOptions.envFiles)
            .withKeyValueArgs('--label', runOptions.labels)
            .withArrayArgs('-v', runOptions.volumes, volume => `${volume.localPath}:${volume.containerPath}${volume.permissions ? ':' + volume.permissions : ''}`)
            .withArrayArgs('-p', runOptions.ports, port => `${port.hostPort ? port.hostPort + ':' : ''}${port.containerPort}${port.protocol ? '/' + port.protocol : ''}`)
            .withArrayArgs('--add-host', runOptions.extraHosts, extraHost => `${extraHost.hostname}:${extraHost.ip}`)
            .withNamedArg('--entrypoint', runOptions.entrypoint)
            .withQuotedArg('foo')
            .withArg(runOptions.command)
            .build();
    }
}
