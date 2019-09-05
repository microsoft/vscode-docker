/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import netCoreTaskHelper, { NetCoreTaskScaffoldingOptions } from '../tasks/netcore/NetCoreTaskHelper';
import nodeTaskHelper from '../tasks/node/NodeTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration, DockerDebugScaffoldContext } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import netCoreDebugHelper, { NetCoreDebugScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import nodeDebugHelper from './node/NodeDebugHelper';

export type NetCoreScaffoldingOptions = NetCoreDebugScaffoldingOptions | NetCoreTaskScaffoldingOptions;

export interface IDockerDebugScaffoldingProvider {
    initializeNetCoreForDebugging(context: DockerDebugScaffoldContext, options?: NetCoreScaffoldingOptions): Promise<void>;
    initializeNodeForDebugging(context: DockerDebugScaffoldContext): Promise<void>;
}

export class DockerDebugScaffoldingProvider implements IDockerDebugScaffoldingProvider {
    public async initializeNetCoreForDebugging(context: DockerDebugScaffoldContext, options?: NetCoreScaffoldingOptions): Promise<void> {
        await this.initializeForDebugging(
            context,
            (_context: DockerDebugScaffoldContext) => netCoreDebugHelper.provideDebugConfigurations(_context, options),
            (_context: DockerDebugScaffoldContext) => netCoreTaskHelper.provideDockerBuildTasks(_context, options),
            (_context: DockerDebugScaffoldContext) => netCoreTaskHelper.provideDockerRunTasks(_context, options));
    }

    public async initializeNodeForDebugging(context: DockerDebugScaffoldContext): Promise<void> {
        await this.initializeForDebugging(
            context,
            (_context: DockerDebugScaffoldContext) => nodeDebugHelper.provideDebugConfigurations(_context),
            (_context: DockerDebugScaffoldContext) => nodeTaskHelper.provideDockerBuildTasks(_context),
            (_context: DockerDebugScaffoldContext) => nodeTaskHelper.provideDockerRunTasks(_context));
    }

    private async initializeForDebugging(
        context: DockerDebugScaffoldContext,
        provideDebugConfigurations: (_context: DockerDebugScaffoldContext) => Promise<DockerDebugConfiguration[]>,
        provideDockerBuildTasks: (_context: DockerDebugScaffoldContext) => Promise<DockerBuildTaskDefinition[]>,
        provideDockerRunTasks: (_context: DockerDebugScaffoldContext) => Promise<DockerRunTaskDefinition[]>): Promise<void> {
        const debugConfigurations = await provideDebugConfigurations(context);

        const buildTasks = await provideDockerBuildTasks(context);

        for (const buildTask of buildTasks) {
            await addTask(buildTask);
        }

        const runTasks = await provideDockerRunTasks(context);

        for (const runTask of runTasks) {
            await addTask(runTask);
        }

        for (const debugConfiguration of debugConfigurations) {
            await addDebugConfiguration(debugConfiguration);
        }
    }
}

const dockerDebugScaffoldingProvider: IDockerDebugScaffoldingProvider = new DockerDebugScaffoldingProvider();

export default dockerDebugScaffoldingProvider;
