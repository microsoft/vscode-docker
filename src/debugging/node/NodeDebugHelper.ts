/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NodeTaskHelper } from '../../tasks/node/NodeTaskHelper';
import { inferPackageName, readPackage } from '../../utils/nodeUtils';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, ResolvedDebugConfigurationOptions, resolveDockerServerReadyAction } from '../DebugHelper';
import { DebugConfigurationBase, DockerDebugConfigurationBase } from '../DockerDebugConfigurationBase';
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
                name: 'Docker Node.js Launch',
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
            type: 'node2'
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
