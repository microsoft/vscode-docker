/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { l10n, Task } from 'vscode';
import { DockerPlatform } from '../debugging/DockerPlatformHelper';
import { ext } from '../extensionVariables';
import { RunContainerBindMount } from '../runtimes/docker';
import { cloneObject } from '../utils/cloneObject';
import { DockerContainerVolume, DockerRunOptions } from './DockerRunTaskDefinitionBase';
import { DockerTaskProvider } from './DockerTaskProvider';
import { NetCoreRunTaskDefinition } from './netcore/NetCoreTaskHelper';
import { NodeRunTaskDefinition } from './node/NodeTaskHelper';
import { defaultVsCodeLabels, getAggregateLabels } from './TaskDefinitionBase';
import { DockerRunTaskContext, getAssociatedDockerBuildTask, TaskHelper, throwIfCancellationRequested } from './TaskHelper';

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

        context.buildDefinition = await getAssociatedDockerBuildTask(task, context.folder);
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

        const client = await ext.runtimeManager.getClient();

        const options = definition.dockerRun;
        const command = await client.runContainer({
            detached: true,
            publishAllPorts: options.portsPublishAll || (options.portsPublishAll === undefined && (options.ports === undefined || options.ports.length < 1)),
            name: options.containerName,
            network: options.network,
            networkAlias: options.networkAlias,
            environmentVariables: options.env,
            environmentFiles: options.envFiles,
            labels: getAggregateLabels(options.labels, defaultVsCodeLabels),
            mounts: this.getMounts(options.volumes),
            ports: options.ports,
            addHost: options.extraHosts,
            entrypoint: options.entrypoint,
            removeOnExit: options.remove,
            customOptions: options.customOptions,
            imageRef: options.image,
            command: options.command,
        });

        const runner = context.terminal.getCommandRunner({
            folder: context.folder,
            token: context.cancellationToken,
        });

        context.containerId = await runner(command);
        throwIfCancellationRequested(context);

        if (helper && helper.postRun) {
            await helper.postRun(context, definition);
        }
    }

    private async validateResolvedDefinition(context: DockerRunTaskContext, dockerRun: DockerRunOptions): Promise<void> {
        if (!dockerRun.image) {
            throw new Error(l10n.t('No Docker image name was provided or resolved.'));
        }
    }

    private getMounts(volumes?: DockerContainerVolume[]): RunContainerBindMount[] | undefined {
        return volumes?.map(v => {
            return {
                source: v.localPath,
                destination: v.containerPath,
                readOnly: v.permissions === 'ro' || (v.permissions as unknown === 'ro,z'), // Maintain compatibility with old `ro,z` option as much as possible
                type: 'bind',
            };
        });
    }
}
