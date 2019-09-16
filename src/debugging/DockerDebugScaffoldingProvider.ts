/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import { netCoreTaskHelper, NetCoreTaskScaffoldingOptions } from '../tasks/netcore/NetCoreTaskHelper';
import { nodeTaskHelper } from '../tasks/node/NodeTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration, DockerDebugScaffoldContext } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import { netCoreDebugHelper, NetCoreDebugScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import { nodeDebugHelper } from './node/NodeDebugHelper';

export type NetCoreScaffoldingOptions = NetCoreDebugScaffoldingOptions | NetCoreTaskScaffoldingOptions;

export interface IDockerDebugScaffoldingProvider {
    initializeNetCoreForDebugging(context: DockerDebugScaffoldContext, options?: NetCoreScaffoldingOptions): Promise<void>;
    initializeNodeForDebugging(context: DockerDebugScaffoldContext): Promise<void>;
}

export class DockerDebugScaffoldingProvider implements IDockerDebugScaffoldingProvider {
    public async initializeNetCoreForDebugging(context: DockerDebugScaffoldContext, options?: NetCoreScaffoldingOptions): Promise<void> {
        await this.initializeForDebugging(
            () => netCoreDebugHelper.provideDebugConfigurations(context, options),
            () => netCoreTaskHelper.provideDockerBuildTasks(context, options),
            () => netCoreTaskHelper.provideDockerRunTasks(context, options));
    }

    public async initializeNodeForDebugging(context: DockerDebugScaffoldContext): Promise<void> {
        await this.initializeForDebugging(
            () => nodeDebugHelper.provideDebugConfigurations(context),
            () => nodeTaskHelper.provideDockerBuildTasks(context),
            () => nodeTaskHelper.provideDockerRunTasks(context));
    }

    private async initializeForDebugging(
        provideDebugConfigurations: () => Promise<DockerDebugConfiguration[]>,
        provideDockerBuildTasks: () => Promise<DockerBuildTaskDefinition[]>,
        provideDockerRunTasks: () => Promise<DockerRunTaskDefinition[]>): Promise<void> {
        const debugConfigurations = await provideDebugConfigurations();

        const buildTasks = await provideDockerBuildTasks();

        for (const buildTask of buildTasks) {
            await addTask(buildTask);
        }

        const runTasks = await provideDockerRunTasks();

        for (const runTask of runTasks) {
            await addTask(runTask);
        }

        for (const debugConfiguration of debugConfigurations) {
            await addDebugConfiguration(debugConfiguration);
        }
    }
}

export const dockerDebugScaffoldingProvider: IDockerDebugScaffoldingProvider = new DockerDebugScaffoldingProvider();
