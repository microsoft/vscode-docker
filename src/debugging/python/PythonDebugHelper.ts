/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { ext } from '../../extensionVariables';
import { PythonExtensionHelper } from '../../tasks/python/PythonExtensionHelper';
import { PythonRunTaskDefinition } from '../../tasks/python/PythonTaskHelper';
import LocalOSProvider from '../../utils/LocalOSProvider';
import { PythonProjectType } from '../../utils/pythonUtils';
import ChildProcessProvider from '../coreclr/ChildProcessProvider';
import CliDockerClient from '../coreclr/CliDockerClient';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, inferContainerName, ResolvedDebugConfiguration, resolveDockerServerReadyAction } from '../DebugHelper';
import { DockerDebugConfigurationBase } from '../DockerDebugConfigurationBase';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';
import { PythonScaffoldingOptions } from '../DockerDebugScaffoldingProvider';

export interface PythonPathMapping {
    localRoot: string;
    remoteRoot: string;
}

export interface PythonDebugOptions {
    host?: string;
    port?: number;
    pathMappings?: PythonPathMapping[];
    justMyCode?: boolean;
    projectType?: PythonProjectType;
    django?: boolean;
    jinja?: boolean;
    args?: string[];
}

export interface PythonDockerDebugConfiguration extends DockerDebugConfigurationBase {
    python?: PythonDebugOptions;
}

export class PythonDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(context: DockerDebugScaffoldContext, options?: PythonScaffoldingOptions): Promise<DockerDebugConfiguration[]> {
        // Capitalize the first letter.
        const projectType = options.projectType.charAt(0).toUpperCase() + options.projectType.slice(1);

        return [{
            name: `Docker: Python - ${projectType}`,
            type: 'docker',
            request: 'launch',
            preLaunchTask: 'docker-run: debug',
            python: {
                pathMappings: [
                    {
                        /* eslint-disable-next-line no-template-curly-in-string */
                        localRoot: '${workspaceFolder}',
                        remoteRoot: '/app'
                    }
                ],
                projectType: options.projectType
            }
        }];
    }

    public async resolveDebugConfiguration(context: DockerDebugContext, debugConfiguration: PythonDockerDebugConfiguration): Promise<ResolvedDebugConfiguration | undefined> {
        const pyExt = await PythonExtensionHelper.getPythonExtension();
        if (!pyExt) {
            return undefined;
        }

        const containerName = inferContainerName(debugConfiguration, context, context.folder.name);
        const projectType = debugConfiguration.python.projectType;
        const pythonRunTaskOptions = (context.runDefinition as PythonRunTaskDefinition).python;

        const dockerServerReadyAction =
            resolveDockerServerReadyAction(
                debugConfiguration,
                {
                    containerName: containerName,
                    pattern: this.getServerReadyPattern(projectType),
                    uriFormat: '%s://localhost:%s'
                },
                true);

        const args = [...debugConfiguration.python.args || pythonRunTaskOptions.args || [], containerName];
        const launcherPath = path.join(ext.context.asAbsolutePath('resources'), 'python', 'launcher.py');

        return {
            name: debugConfiguration.name,
            preLaunchTask: debugConfiguration.preLaunchTask,
            type: 'python',
            request: 'launch',
            pathMappings: debugConfiguration.python.pathMappings,
            justMyCode: debugConfiguration.python.justMyCode || true,
            django: debugConfiguration.python.django || projectType === 'django',
            jinja: debugConfiguration.python.jinja || projectType === 'flask',
            dockerOptions: {
                containerName: containerName,
                dockerServerReadyAction: dockerServerReadyAction,
                removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
            },
            debugLauncherPath: debugConfiguration.debugLauncherPath || launcherPath,
            debugAdapterHost: debugConfiguration.debugAdapterHost || await this.getDebugAdapterHost(),
            console: debugConfiguration.console || "integratedTerminal",
            internalConsoleOptions: debugConfiguration.internalConsoleOptions || "openOnSessionStart",
            module: debugConfiguration.module || pythonRunTaskOptions.module,
            program: debugConfiguration.file || pythonRunTaskOptions.file,
            redirectOutput: debugConfiguration.redirectOutput || true,
            args: args,
            cwd: '.'
        };
    }

    private getServerReadyPattern(projectType: PythonProjectType): string | undefined {
        switch (projectType) {
            case 'django':
                return 'Starting development server at (https?://\\S+|[0-9]+)';
            case 'flask':
                return 'Running on (https?://\\S+|[0-9]+)';
            default:
                return undefined;
        }
    }

    private async getDebugAdapterHost(): Promise<string> {
        const osProvider = new LocalOSProvider();

        // For Windows and Mac, we ask debugpy to listen on localhost:{randomPort} and then
        // we use 'host.docker.internal' in the launcher to get the host's ip address.
        if (osProvider.os !== 'Linux') {
            return 'localhost';
        }

        // For Linux, 'host.docker.internal' doesn't work, so we ask debugpy to listen
        // on the bridge network's ip address (predefined network).
        const dockerClient = new CliDockerClient(new ChildProcessProvider());
        const dockerBridgeIp = await dockerClient.inspectObject('bridge', {
            format: '{{(index .IPAM.Config 0).Gateway}}'
        });

        return dockerBridgeIp;
    }
}

export const pythonDebugHelper = new PythonDebugHelper();
