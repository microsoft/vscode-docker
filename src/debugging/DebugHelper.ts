/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { commands, debug, DebugConfiguration, ExtensionContext, workspace } from 'vscode';
import { initializeForDebugging } from '../commands/debugging/initializeForDebugging';
import { DockerTaskContext, DockerTaskScaffoldContext } from '../tasks/TaskHelper';
import ChildProcessProvider from './coreclr/ChildProcessProvider';
import CliDockerClient from './coreclr/CliDockerClient';
import { DockerServerReadyAction } from './DockerDebugConfigurationBase';
import { DockerDebugConfiguration, DockerDebugConfigurationProvider } from './DockerDebugConfigurationProvider';
import { activate } from './DockerServerReadyAction';
import netCoreDebugHelper from './netcore/NetCoreDebugHelper';
import nodeDebugHelper from './node/NodeDebugHelper';

// tslint:disable-next-line: no-empty-interface
export interface DockerDebugContext extends DockerTaskContext {
}

// tslint:disable-next-line: no-empty-interface
export interface DockerDebugScaffoldContext extends DockerTaskScaffoldContext {
}

export interface ResolvedDebugConfigurationOptions {
    containerNameToKill?: string;
    dockerServerReadyAction?: DockerServerReadyAction;
    removeContainerAfterDebug?: boolean;
}

export interface ResolvedDebugConfiguration extends DebugConfiguration {
    dockerOptions?: ResolvedDebugConfigurationOptions;
}

export interface DebugHelper {
    provideDebugConfigurations(context: DockerDebugScaffoldContext): Promise<DockerDebugConfiguration[]>;
    resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: DockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined>;
}

export function registerDebugProvider(ctx: ExtensionContext): void {
    ctx.subscriptions.push(
        debug.registerDebugConfigurationProvider(
            'docker-launch',
            new DockerDebugConfigurationProvider(
                new CliDockerClient(new ChildProcessProvider()),
                {
                    netCore: netCoreDebugHelper,
                    node: nodeDebugHelper
                }
            )
        )
    );

    activate(ctx);

    ctx.subscriptions.push(
        commands.registerCommand(
            'vscode-docker.debugging.initializeForDebugging',
            async () => await initializeForDebugging()
        )
    );
}

export async function addDebugConfiguration(debugConfiguration: DockerDebugConfiguration): Promise<boolean> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const workspaceLaunch = workspace.getConfiguration('launch');
    const allConfigs = workspaceLaunch.configurations as DebugConfiguration[] || [];

    if (allConfigs.some(c => c.name === debugConfiguration.name)) {
        return false;
    }

    allConfigs.push(debugConfiguration);
    workspaceLaunch.update('configurations', allConfigs);
    return true;
}
