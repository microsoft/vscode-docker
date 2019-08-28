/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, commands, debug, ExtensionContext, workspace, WorkspaceFolder } from 'vscode';
import { initializeForDebugging } from '../commands/debugging/initializeForDebugging';
import { ext } from '../extensionVariables';
import { DockerDebugAdapterTrackerFactory } from './DockerDebugAdapterTracker';
import { DockerDebugConfiguration, DockerDebugConfigurationProvider } from './DockerDebugConfigurationProvider';
import { NetCoreDebugHelper } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper } from './node/NodeDebugHelper';

export interface DebugHelper {
    // tslint:disable-next-line: no-any
    provideDebugConfigurations(options?: any): Promise<DockerDebugConfiguration[]>;
    resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration>;
}

export function registerDebugProvider(ctx: ExtensionContext): void {
    ctx.subscriptions.push(
        debug.registerDebugConfigurationProvider(
            'docker-launch',
            ext.debugConfigProvider = new DockerDebugConfigurationProvider(
                new NetCoreDebugHelper(),
                new NodeDebugHelper()
            )
        )
    );

    ctx.subscriptions.push(
        debug.registerDebugAdapterTrackerFactory(
            '*',
            new DockerDebugAdapterTrackerFactory()
        )
    );

    ctx.subscriptions.push(
        commands.registerCommand(
            'vscode-docker.debugging.initializeForDebugging',
            async () => await initializeForDebugging()
        )
    );
}

export async function addDebugConfiguration(debugConfiguration: DockerDebugConfiguration): Promise<void> {
    const workspaceLaunch = workspace.getConfiguration('launch');
    const allConfigs = workspaceLaunch.configurations as object[] || [];

    allConfigs.push(debugConfiguration);

    workspaceLaunch.update('configurations', allConfigs);
}
