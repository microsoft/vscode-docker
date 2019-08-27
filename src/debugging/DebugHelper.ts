/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, debug, ExtensionContext, WorkspaceFolder } from 'vscode';
import { DockerDebugAdapterTrackerFactory } from './DockerDebugAdapterTracker';
import { DockerDebugConfiguration, DockerDebugConfigurationProvider } from './DockerDebugConfigurationProvider';
import { NetCoreDebugHelper } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper } from './node/NodeDebugHelper';

export interface DebugHelper {
    provideDebugConfigurations(): Promise<DockerDebugConfiguration[]>;
    resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration>;
}

export function registerDebugProvider(ctx: ExtensionContext): void {
    ctx.subscriptions.push(
        debug.registerDebugConfigurationProvider(
            'docker-launch',
            new DockerDebugConfigurationProvider(
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
}
