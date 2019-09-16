/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration } from '../DebugHelper';
import { DockerDebugConfigurationBase, DockerServerReadyAction } from '../DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

export interface PythonPathMapping {
    localRoot: string,
    remoteRoot: string,
}

export interface PythonDebugOptions {
    host?: string;
    port?: number;
    pathMappings?: PythonPathMapping[],
    justMyCode?: boolean,
}

export interface PythonDockerDebugConfiguration extends DockerDebugConfigurationBase {
    python?: PythonDebugOptions;
}

export class PythonDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(context: DockerDebugScaffoldContext): Promise<DockerDebugConfiguration[]> {
        // tslint:disable: no-invalid-template-strings
        return [
            {
                name: 'Docker: Python Launch and Attach',
                type: 'docker',
                request: 'launch',
                preLaunchTask: 'docker-run: debug',
                platform: 'python',
                python: {
                    pathMappings: [
                        {
                            localRoot: '${workspaceFolder}',
                            remoteRoot: '/app'
                        }
                    ]
                },
            }
        ];
        // tslint:enable: no-invalid-template-strings
    }

    public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: PythonDockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        const containerName = inferContainerName(debugConfiguration, context, context.folder.name);

        /* TODO : Python DockerServerReadyAction options?
        const dockerServerReadyAction = resolveDockerServerReadyAction(
            debugConfiguration,
            {
                containerName: containerName
            },
            false
        );
        */
        const dockerServerReadyAction: DockerServerReadyAction = undefined;

        // TODO: python attach fails if we don't inject a brief sleep between the true preLaunchTask, and executing the attach
        // Seems that the attempt to attach happens too quickly after `docker run` starts the container
        return {
            ...debugConfiguration,
            type: 'python',
            request: 'attach',
            host: debugConfiguration.python.host || 'localhost',
            port: debugConfiguration.python.port || 5678,
            pathMappings: debugConfiguration.python.pathMappings,
            justMyCode: debugConfiguration.python.justMyCode,
            serverReadyAction: debugConfiguration.serverReadyAction,
            dockerOptions: {
                containerNameToKill: containerName,
                dockerServerReadyAction: dockerServerReadyAction,
                removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
            }
        };
    }
}

const pythonDebugHelper = new PythonDebugHelper();

export default pythonDebugHelper;
