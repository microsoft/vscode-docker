/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MessageItem, window } from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';
import { DockerBuildTaskDefinition } from '../tasks/DockerBuildTaskProvider';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import { netCoreTaskHelper, NetCoreTaskScaffoldingOptions } from '../tasks/netcore/NetCoreTaskHelper';
import { nodeTaskHelper } from '../tasks/node/NodeTaskHelper';
import { pythonTaskHelper } from '../tasks/python/PythonTaskHelper';
import { addTask } from '../tasks/TaskHelper';
import { addDebugConfiguration, DockerDebugScaffoldContext } from './DebugHelper';
import { DockerDebugConfiguration } from './DockerDebugConfigurationProvider';
import { netCoreDebugHelper, NetCoreDebugScaffoldingOptions } from './netcore/NetCoreDebugHelper';
import { nodeDebugHelper } from './node/NodeDebugHelper';
import { pythonDebugHelper } from './python/PythonDebugHelper';

export type NetCoreScaffoldingOptions = NetCoreDebugScaffoldingOptions | NetCoreTaskScaffoldingOptions;

export interface IDockerDebugScaffoldingProvider {
    initializeNetCoreForDebugging(context: DockerDebugScaffoldContext, options?: NetCoreScaffoldingOptions): Promise<void>;
    initializeNodeForDebugging(context: DockerDebugScaffoldContext): Promise<void>;
    initializePythonForDebugging(context: DockerDebugScaffoldContext): Promise<void>;
}

export class DockerDebugScaffoldingProvider implements IDockerDebugScaffoldingProvider {
    public async initializeNetCoreForDebugging(context: DockerDebugScaffoldContext, options?: NetCoreScaffoldingOptions): Promise<void> {
        await this.initializeForDebugging(
            () => netCoreDebugHelper.provideDebugConfigurations(context, options),
            () => netCoreTaskHelper.provideDockerBuildTasks(context, options),
            () => netCoreTaskHelper.provideDockerRunTasks(context, options)
        );
    }

    public async initializeNodeForDebugging(context: DockerDebugScaffoldContext): Promise<void> {
        await this.initializeForDebugging(
            () => nodeDebugHelper.provideDebugConfigurations(context),
            () => nodeTaskHelper.provideDockerBuildTasks(context),
            () => nodeTaskHelper.provideDockerRunTasks(context)
        );
    }

    public async initializePythonForDebugging(context: DockerDebugScaffoldContext): Promise<void> {
        await this.initializeForDebugging(
            () => pythonDebugHelper.provideDebugConfigurations(context),
            () => pythonTaskHelper.provideDockerBuildTasks(context),
            () => pythonTaskHelper.provideDockerRunTasks(context)
        );
    }

    private async initializeForDebugging(
        provideDebugConfigurations: () => Promise<DockerDebugConfiguration[]>,
        provideDockerBuildTasks: () => Promise<DockerBuildTaskDefinition[]>,
        provideDockerRunTasks: () => Promise<DockerRunTaskDefinition[]>): Promise<void> {
        let overwrite: boolean | undefined;

        const buildTasks = await provideDockerBuildTasks();
        const runTasks = await provideDockerRunTasks();
        const debugConfigurations = await provideDebugConfigurations();

        for (const buildTask of buildTasks) {
            overwrite = await DockerDebugScaffoldingProvider.addObjectWithOverwritePrompt((_overwrite: boolean | undefined) => addTask(buildTask, _overwrite), overwrite);
        }

        for (const runTask of runTasks) {
            overwrite = await DockerDebugScaffoldingProvider.addObjectWithOverwritePrompt((_overwrite: boolean | undefined) => addTask(runTask, _overwrite), overwrite);
        }

        for (const debugConfiguration of debugConfigurations) {
            overwrite = await DockerDebugScaffoldingProvider.addObjectWithOverwritePrompt((_overwrite: boolean | undefined) => addDebugConfiguration(debugConfiguration, _overwrite), overwrite);
        }
    }

    private static async addObjectWithOverwritePrompt(addMethod: (_overwrite: boolean | undefined) => Promise<boolean>, overwrite: boolean | undefined): Promise<boolean | undefined> {
        const added = await addMethod(overwrite);

        if (!added && overwrite === undefined) {
            // If it did not get added due to duplicate, and we haven't prompted yet, prompt now
            const overwriteMessageItem: MessageItem = {
                title: 'Overwrite'
            };

            overwrite = (overwriteMessageItem === await window.showErrorMessage("Docker launch configurations and/or tasks already exist. Do you want to overwrite them?", ...[overwriteMessageItem, DialogResponses.no]));

            if (overwrite) {
                // Try again if needed
                await addMethod(overwrite);
            }
        }

        return overwrite;
    }
}

export const dockerDebugScaffoldingProvider: IDockerDebugScaffoldingProvider = new DockerDebugScaffoldingProvider();
