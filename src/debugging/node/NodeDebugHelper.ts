/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NodeTaskHelper } from '../../tasks/node/NodeTaskHelper';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, ResolvedDebugConfigurationOptions } from '../DebugHelper';
import { DebugConfigurationBase, DockerDebugConfigurationBase, DockerServerReadyAction } from '../DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

export interface NodeDebugOptions {
    address?: string;
    autoAttachChildProcesses?: boolean;
    localRoot?: string;
    outFiles?: string[];
    port?: number;
    remoteRoot?: string;
    skipFiles?: string[];
    smartStep?: boolean;
    sourceMaps?: boolean;
    stopOnEntry?: boolean;
    timeout?: number;
    trace?: boolean | 'verbose';
}

export interface NodeDockerDebugOptions extends NodeDebugOptions {
    package?: string;
}

export interface NodeDebugConfiguration extends DebugConfigurationBase, NodeDebugOptions {
}

export interface NodeDockerDebugConfiguration extends DockerDebugConfigurationBase {
    node?: NodeDockerDebugOptions;
}

export class NodeDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(context: DockerDebugScaffoldContext): Promise<DockerDebugConfiguration[]> {
        return [
            {
                name: 'Docker Node.js Launch and Attach',
                type: 'docker',
                request: 'launch',
                preLaunchTask: 'docker-run: debug',
                platform: 'node'
            }
        ];
    }

    public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: NodeDockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        const options = debugConfiguration.node || {};

        const packagePath = NodeTaskHelper.inferPackagePath(options.package, context.folder);
        const packageName = await NodeTaskHelper.inferPackageName(packagePath);

        let numBrowserOptions = [debugConfiguration.launchBrowser, debugConfiguration.serverReadyAction, debugConfiguration.dockerServerReadyAction].filter(property => property !== undefined).length;

        if (numBrowserOptions > 1) {
            throw new Error(`Only one of the 'launchBrowser', 'serverReadyAction', and 'dockerServerReadyAction' properties may be set at a time.`);
        }

        const containerName = inferContainerName(debugConfiguration, context, packageName);

        const dockerServerReadyAction: DockerServerReadyAction = numBrowserOptions === 1
            ? debugConfiguration.dockerServerReadyAction
            : {
                containerName
            };

        const dockerOptions: ResolvedDebugConfigurationOptions = {
            containerNameToKill: containerName,
            dockerServerReadyAction,
            removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
        };

        const resolvedConfiguration: NodeDebugConfiguration = {
            ...options,
            name: debugConfiguration.name,
            dockerOptions,
            preLaunchTask: debugConfiguration.preLaunchTask,
            request: 'attach',
            type: 'node2'
        };

        if (resolvedConfiguration.localRoot === undefined) {
            // tslint:disable-next-line: no-invalid-template-strings
            resolvedConfiguration.localRoot = '${workspaceFolder}';
        }

        if (resolvedConfiguration.port === undefined) {
            resolvedConfiguration.port = 9229;
        }

        if (resolvedConfiguration.remoteRoot === undefined) {
            resolvedConfiguration.remoteRoot = '/usr/src/app';
        }

        return resolvedConfiguration;
    }
}

const nodeDebugHelper = new NodeDebugHelper();

export default nodeDebugHelper;
