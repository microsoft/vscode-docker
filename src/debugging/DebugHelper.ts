/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import { CancellationToken, ConfigurationTarget, DebugConfiguration, ExtensionContext, WorkspaceFolder, debug, workspace } from 'vscode';
import { localize } from '../localize';
import { DockerRunTaskDefinition } from '../tasks/DockerRunTaskProvider';
import { DockerTaskScaffoldContext, getDefaultContainerName } from '../tasks/TaskHelper';
import { DockerServerReadyAction } from './DockerDebugConfigurationBase';
import { DockerDebugConfiguration, DockerDebugConfigurationProvider } from './DockerDebugConfigurationProvider';
import { DockerPlatform } from './DockerPlatformHelper';
import { registerServerReadyAction } from './DockerServerReadyAction';
import { netCoreDebugHelper } from './netcore/NetCoreDebugHelper';
import { nodeDebugHelper } from './node/NodeDebugHelper';
import { pythonDebugHelper } from './python/PythonDebugHelper';

export interface DockerDebugContext { // Same as DockerTaskContext but intentionally does not extend it, since we never need to pass a DockerDebugContext to tasks
    folder: WorkspaceFolder;
    platform: DockerPlatform;
    actionContext: IActionContext;
    cancellationToken?: CancellationToken;
    runDefinition?: DockerRunTaskDefinition;
}

/* eslint-disable-next-line @typescript-eslint/no-empty-interface */
export interface DockerDebugScaffoldContext extends DockerTaskScaffoldContext {
}

export interface ResolvedDebugConfigurationOptions {
    containerName?: string;
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
            'docker',
            new DockerDebugConfigurationProvider(
                {
                    netCore: netCoreDebugHelper,
                    node: nodeDebugHelper,
                    python: pythonDebugHelper,
                }
            )
        )
    );

    registerServerReadyAction(ctx);
}

// TODO: This is stripping out a level of indentation, but the tasks one isn't
export async function addDebugConfiguration(newConfig: DockerDebugConfiguration, folder: WorkspaceFolder, overwrite?: boolean): Promise<boolean> {
    // Using config API instead of tasks API means no wasted perf on re-resolving the tasks, and avoids confusion on resolved type !== true type
    const workspaceLaunch = workspace.getConfiguration('launch', folder.uri);
    const allConfigs = workspaceLaunch && workspaceLaunch.configurations as DebugConfiguration[] || [];

    const existingConfigIndex = allConfigs.findIndex(c => c.name === newConfig.name);
    if (existingConfigIndex >= 0) {
        // If a task of the same label exists already
        if (overwrite) {
            // If overwriting, do so
            allConfigs[existingConfigIndex] = newConfig;
        } else {
            // If not overwriting, return false
            return false;
        }
    } else {
        allConfigs.push(newConfig);
    }

    await workspaceLaunch.update('configurations', allConfigs, ConfigurationTarget.WorkspaceFolder);
    return true;
}

export function inferContainerName(debugConfiguration: DockerDebugConfiguration, context: DockerDebugContext, defaultNameHint: string, defaultTag?: 'dev' | 'latest'): string {
    return (debugConfiguration && debugConfiguration.containerName)
        || (context && context.runDefinition && context.runDefinition.dockerRun && context.runDefinition.dockerRun.containerName)
        || getDefaultContainerName(defaultNameHint, defaultTag);
}

export function resolveDockerServerReadyAction(debugConfiguration: DockerDebugConfiguration, defaultDockerSRA: DockerServerReadyAction, createIfUserUndefined: boolean): DockerServerReadyAction | undefined {
    const numBrowserOptions = [debugConfiguration.launchBrowser, debugConfiguration.serverReadyAction, debugConfiguration.dockerServerReadyAction].filter(item => item !== undefined).length;

    if (numBrowserOptions > 1) {
        // Multiple user-provided options is not valid
        throw new Error(localize('vscode-docker.debug.helper.oneBrowserAction', 'Only at most one of the \'launchBrowser\', \'serverReadyAction\', and \'dockerServerReadyAction\' properties may be set at a time.'));
    } else if (numBrowserOptions === 1 && !debugConfiguration.dockerServerReadyAction) {
        // One user-provided option that is not DockerServerReadyAction--return nothing
        return undefined;
    } else if (numBrowserOptions === 0 && !createIfUserUndefined) {
        // No user-provided option, and not creating if nothing user-defined--return nothing
        return undefined;
    }

    // Otherwise create one based on user-defined and default options
    const providedDockerSRA = debugConfiguration.dockerServerReadyAction || {};

    return {
        containerName: providedDockerSRA.containerName || defaultDockerSRA.containerName,
        pattern: providedDockerSRA.pattern || defaultDockerSRA.pattern,
        action: providedDockerSRA.action || defaultDockerSRA.action,
        uriFormat: providedDockerSRA.uriFormat || defaultDockerSRA.uriFormat,
        webRoot: providedDockerSRA.webRoot || defaultDockerSRA.webRoot,
    };
}
