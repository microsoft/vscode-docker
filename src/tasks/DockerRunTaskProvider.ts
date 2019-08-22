import { CancellationToken, ProviderResult, ShellExecution, ShellQuotedString, Task, TaskDefinition, TaskProvider, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { Platform, PlatformOS } from '../utils/platform';
import { NetCoreTaskHelperType, NetCoreTaskOptions } from './netcore/NetCoreTaskHelper';
import { NodeTaskHelperType, NodeTaskRunOptions } from './node/NodeTaskHelper';
import { TaskPlatform } from './TaskHelper';

export interface DockerContainerExtraHost {
    hostname: string;
    ip: string;
}

export interface DockerContainerPort {
    hostPort?: number;
    containerPort: number;
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
    image?: string;
    labels?: { [key: string]: string };
    network?: string;
    networkAlias?: string;
    os?: PlatformOS;
    ports?: DockerContainerPort[];
    portsPublishAll?: boolean;
    volumes?: DockerContainerVolume[];
}

export interface DockerRunTaskDefinition extends TaskDefinition {
    dockerRun?: DockerRunOptions;
    netCore?: NetCoreTaskOptions;
    node?: NodeTaskRunOptions;
    platform: TaskPlatform;
}

export interface DockerRunTask extends Task {
    definition: DockerRunTaskDefinition;
}

export class DockerRunTaskProvider implements TaskProvider {
    constructor(
        private readonly netCoreTaskHelper: NetCoreTaskHelperType,
        private readonly nodeTaskHelper: NodeTaskHelperType
    ) { }

    public provideTasks(token?: CancellationToken): ProviderResult<Task[]> {
        return []; // Intentionally empty, so that resolveTask gets used
    }

    public resolveTask(task: DockerRunTask, token?: CancellationToken): ProviderResult<Task> {
        return callWithTelemetryAndErrorHandling(
            'docker-run',
            async () => await this.resolveTaskInternal(task, token));
    }

    public async initializeRunTasks(folder: WorkspaceFolder, platform: Platform): Promise<void> {
        throw new Error('Method not implemented.');
    }

    private async resolveTaskInternal(task: DockerRunTask, token?: CancellationToken): Promise<Task> {
        let runOptions: DockerRunOptions = task.definition.dockerRun ? cloneObject(task.definition.dockerRun) : {};

        if (task.scope as WorkspaceFolder !== undefined) {
            if (task.definition.platform === 'netCore') {
                const helperOptions = cloneObject(task.definition.netCore);
                runOptions = await this.netCoreTaskHelper.resolveDockerRunOptions(task.scope as WorkspaceFolder, runOptions, helperOptions, token);
            } else if (task.definition.platform === 'node') {
                const helperOptions = cloneObject(task.definition.node);
                runOptions = await this.nodeTaskHelper.resolveDockerRunOptions(task.scope as WorkspaceFolder, runOptions, helperOptions, token);
            } else {
                throw new Error(`Unrecognized platform '${task.definition.platform}'.`)
            }
        } else {
            throw new Error(`Unable to determine task scope to execute docker-run task '${task.name}'.`);
        }

        const commandLine = await this.resolveCommandLine(runOptions, token);
        return new Task(
            task.definition,
            task.scope,
            task.name,
            task.source,
            new ShellExecution(commandLine[0], commandLine.slice(1)),
            task.problemMatchers);
    }

    private async resolveCommandLine(runOptions: DockerRunOptions, token?: CancellationToken): Promise<ShellQuotedString[]> {
        return CommandLineBuilder
            .create('docker', 'run', '-dt')
            .withFlagArg('-P', runOptions.portsPublishAll || (runOptions.portsPublishAll === undefined && (runOptions.ports === undefined || runOptions.ports.length < 1)))
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
            .withQuotedArg(runOptions.image)
            .withArgs(runOptions.command)
            .buildShellQuotedStrings();
    }
}
