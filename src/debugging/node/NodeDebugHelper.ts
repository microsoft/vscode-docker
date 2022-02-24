/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { NodeTaskHelper } from '../../tasks/node/NodeTaskHelper';
import { inferPackageName, readPackage } from '../../utils/nodeUtils';
import { unresolveWorkspaceFolder } from '../../utils/resolveVariables';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, ResolvedDebugConfiguration, ResolvedDebugConfigurationOptions, inferContainerName, resolveDockerServerReadyAction } from '../DebugHelper';
import { DebugConfigurationBase, DockerDebugConfigurationBase } from '../DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';
import { NodeScaffoldingOptions } from '../DockerDebugScaffoldingProvider';

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
    trace?: boolean;
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
    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: NodeScaffoldingOptions): Promise<DockerDebugConfiguration[]> {
        // If the package is at the root, we'll leave it out of the config for brevity, otherwise it must be specified explicitly
        const nodeOptions: NodeDockerDebugOptions = NodeTaskHelper.getNodeOptionsForScaffolding(options?.package, context.folder);

        if (nodeOptions) {
            // localRoot must match the build context
            nodeOptions.localRoot = unresolveWorkspaceFolder(path.dirname(options.package), context.folder);
        }

        return [
            {
                name: 'Docker Node.js Launch',
                type: 'docker',
                request: 'launch',
                preLaunchTask: 'docker-run: debug',
                platform: 'node',
                node: nodeOptions,
            }
        ];
    }

    public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: NodeDockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        const options = debugConfiguration.node || {};

        const packagePath = NodeTaskHelper.inferPackagePath(options.package, context.folder);
        const nodePackage = await readPackage(packagePath);
        const packageName = await inferPackageName(nodePackage, packagePath);

        const containerName = inferContainerName(debugConfiguration, context, packageName);

        const dockerServerReadyAction = resolveDockerServerReadyAction(
            debugConfiguration,
            {
                containerName,
                // Remainder are defaults of DockerServerReadyAction
            },
            true
        );

        const dockerOptions: ResolvedDebugConfigurationOptions = {
            containerName: containerName,
            dockerServerReadyAction,
            removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
        };

        const resolvedConfiguration: NodeDebugConfiguration = {
            ...debugConfiguration,
            ...options,
            dockerOptions,
            request: 'attach',
            type: 'pwa-node'
        };

        if (resolvedConfiguration.localRoot === undefined) {
            /* eslint-disable-next-line no-template-curly-in-string */
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

export const nodeDebugHelper = new NodeDebugHelper();
