/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Task } from 'vscode';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { cloneObject } from '../utils/cloneObject';
import { CommandLineBuilder } from '../utils/commandLineBuilder';
import { DockerContainerVolume, DockerRunOptions } from './DockerRunTaskDefinitionBase';
import { DockerTaskProvider } from './DockerTaskProvider';
import { NetCoreRunTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeRunTaskDefinition } from './node/NodeTaskHelper';
import { defaultVsCodeLabels, getAggregateLabels } from './TaskDefinitionBase';
import { DockerRunTaskContext, TaskHelper, getAssociatedDockerBuildTask, throwIfCancellationRequested } from './TaskHelper';

export interface DockerRunTaskDefinition extends NetCoreRunTaskDefinition, NodeRunTaskDefinition {
    label?: string;
    dependsOn?: string[];
    platform?: DockerPlatform;
}

export interface DockerRunTask extends Task {
    definition: DockerRunTaskDefinition;
}

export class DockerRunTaskProvider extends DockerTaskProvider {
    public constructor(helpers: { [key in DockerPlatform]: TaskHelper }) { super('docker-run', helpers); }

    // TODO: Skip if container is freshly started, but probably depends on language
    protected async executeTaskInternal(context: DockerRunTaskContext, task: DockerRunTask): Promise<void> {
        const definition = cloneObject(task.definition);
        definition.dockerRun = definition.dockerRun || {};

        context.actionContext.telemetry.properties.containerOS = definition.dockerRun.os || 'Linux';

        context.buildDefinition = await getAssociatedDockerBuildTask(task);
        context.actionContext.telemetry.properties.buildTaskFound = context.buildDefinition ? 'true' : 'false';

        const helper = this.getHelper(context.platform);

        if (helper && helper.preRun) {
            await helper.preRun(context, definition);
            throwIfCancellationRequested(context);
        }

        if (helper) {
            definition.dockerRun = await helper.getDockerRunOptions(context, definition);
            throwIfCancellationRequested(context);
        }

        await this.validateResolvedDefinition(context, definition.dockerRun);

        const commandLine = await this.resolveCommandLine(definition.dockerRun);

        const stdoutBuffer = Buffer.alloc(4 * 1024); // Any output beyond 4K is not a container ID and we won't deal with it
        const stderrBuffer = Buffer.alloc(10 * 1024);

        await context.terminal.executeCommandInTerminal(
            commandLine,
            context.folder,
            true, // rejectOnStderr
            stdoutBuffer,
            stderrBuffer,
            context.cancellationToken
        );
        throwIfCancellationRequested(context);

        context.containerId = stdoutBuffer.toString();

        if (helper && helper.postRun) {
            await helper.postRun(context, definition);
        }
    }

    private async validateResolvedDefinition(context: DockerRunTaskContext, dockerRun: DockerRunOptions): Promise<void> {
        if (!dockerRun.image) {
            throw new Error(localize('vscode-docker.tasks.runProvider.noDockerImage', 'No Docker image name was provided or resolved.'));
        }
    }

    private async resolveCommandLine(runOptions: DockerRunOptions): Promise<CommandLineBuilder> {
        return CommandLineBuilder
            .create(ext.dockerContextManager.getDockerCommand(), 'run', '-dt')
            .withFlagArg('-P', runOptions.portsPublishAll || (runOptions.portsPublishAll === undefined && (runOptions.ports === undefined || runOptions.ports.length < 1)))
            .withNamedArg('--name', runOptions.containerName)
            .withNamedArg('--network', runOptions.network)
            .withNamedArg('--network-alias', runOptions.networkAlias)
            .withKeyValueArgs('-e', runOptions.env)
            .withArrayArgs('--env-file', runOptions.envFiles)
            .withKeyValueArgs('--label', getAggregateLabels(runOptions.labels, defaultVsCodeLabels))
            .withArrayArgs('-v', runOptions.volumes, volume => `${volume.localPath}:${volume.containerPath}${this.getVolumeOptions(volume, runOptions.os === 'Windows')}`)
            .withArrayArgs('-p', runOptions.ports, port => `${port.hostPort ? port.hostPort + ':' : ''}${port.containerPort}${port.protocol ? '/' + port.protocol : ''}`)
            .withArrayArgs('--add-host', runOptions.extraHosts, extraHost => `${extraHost.hostname}:${extraHost.ip}`)
            .withNamedArg('--entrypoint', runOptions.entrypoint)
            .withFlagArg('--rm', runOptions.remove)
            .withArg(runOptions.customOptions)
            .withQuotedArg(runOptions.image)
            .withArgs(runOptions.command);
    }

    private getVolumeOptions(volume: DockerContainerVolume, isWindows: boolean): string {
        if (!volume.permissions) {
            return '';
        } else if (!isWindows) {
            return ':' + volume.permissions;
        } else {
            // The 'z' and 'Z' options aren't supported on Windows containers, normalize to simply ro / rw
            switch (volume.permissions as string) {
                case 'ro,Z':
                case 'ro,z':
                    return ':ro';
                case 'rw,Z':
                case 'rw,z':
                    return ':rw';
                default:
                    return ':' + volume.permissions;
            }
        }
    }
}
