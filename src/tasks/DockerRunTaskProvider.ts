import { CancellationToken, ProviderResult, ShellExecution, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { CommandLineBuilder } from '../debugging/coreclr/commandLineBuilder';
import { Platform, PlatformOS } from '../utils/platform';
import { NetCoreTaskHelper, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelper, NodeTaskOptions } from './node/NodeTaskHelper';

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
        private readonly netCoreTaskHelper: NetCoreTaskHelper,
        private readonly nodeTaskHelper: NodeTaskHelper
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
        task.definition.dockerRun = task.definition.dockerRun || {};

        if (task.definition.netCore) {
            task.definition = await this.netCoreTaskHelper.resolveDockerRunTaskDefinition(task.definition, token);
        } else if (task.definition.node) {
            task.definition = await this.nodeTaskHelper.resolveDockerRunTaskDefinition(task.definition, token);
        }

        return new Task(task.definition, task.scope, task.name, task.source, new ShellExecution(await this.resolveCommandLine(task, token)), task.problemMatchers);
    }

    private async resolveCommandLine(task: DockerRunTask, token?: CancellationToken): Promise<string> {
        return CommandLineBuilder
            .create('docker', 'run', '-dt')
            .withFlagArg('-P', task.definition.dockerRun.ports === undefined || task.definition.dockerRun.ports.length < 1)
            .withNamedArg('--name', task.definition.dockerRun.containerName)
            .withNamedArg('--network', task.definition.dockerRun.network)
            .withNamedArg('--network-alias', task.definition.dockerRun.networkAlias)
            .withKeyValueArgs('-e', task.definition.dockerRun.env)
            .withArrayArgs('--env-file', task.definition.dockerRun.envFiles)
            .withKeyValueArgs('--label', task.definition.dockerRun.labels)
            .withArrayArgs('-v', task.definition.dockerRun.volumes, volume => `${volume.localPath}:${volume.containerPath}${volume.permissions ? ':' + volume.permissions : ''}`)
            .withArrayArgs('-p', task.definition.dockerRun.ports, port => `${port.hostPort ? port.hostPort + ':' : ''}${port.containerPort}${port.protocol ? '/' + port.protocol : ''}`)
            .withArrayArgs('--add-host', task.definition.dockerRun.extraHosts, extraHost => `${extraHost.hostname}:${extraHost.ip}`)
            .withNamedArg('--entrypoint', task.definition.dockerRun.entrypoint)
            .withQuotedArg('foo')
            .withArg(task.definition.dockerRun.command)
            .build();
    }
}
