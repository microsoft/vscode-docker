/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { ext } from '../../extensionVariables';
import { PythonExtensionHelper } from '../../tasks/python/PythonExtensionHelper';
import { PythonRunTaskDefinition } from '../../tasks/python/PythonTaskHelper';
import { isLinux } from '../../utils/osUtils';
import { PythonProjectType } from '../../utils/pythonUtils';
import { DebugHelper, DockerDebugContext, DockerDebugScaffoldContext, ResolvedDebugConfiguration, inferContainerName, resolveDockerServerReadyAction } from '../DebugHelper';
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
    fastapi?: boolean;
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
        const pythonRunTaskOptions = (context.runDefinition as PythonRunTaskDefinition)?.python || {};

        const dockerServerReadyAction =
            resolveDockerServerReadyAction(
                debugConfiguration,
                {
                    containerName: containerName,
                    pattern: this.getServerReadyPattern(projectType),
                    uriFormat: '%s://localhost:%s'
                },
                true);

        const args = [...(debugConfiguration.python.args || pythonRunTaskOptions.args || []), ext.dockerContextManager.getDockerCommand(context.actionContext), containerName];
        const launcherPath = path.join(ext.context.asAbsolutePath('resources'), 'python', 'launcher.py');

        return {
            ...{ ...debugConfiguration, python: undefined }, // Get the original debug configuration, minus the "python" property which belongs to the Docker launch config and confuses the Python extension
            type: 'python',
            request: 'launch',
            pathMappings: debugConfiguration.python.pathMappings,
            justMyCode: debugConfiguration.python.justMyCode ?? true,
            django: debugConfiguration.python.django || projectType === 'django',
            fastapi: debugConfiguration.python.fastapi || projectType === 'fastapi',
            jinja: debugConfiguration.python.jinja || projectType === 'flask',
            dockerOptions: {
                containerName: containerName,
                dockerServerReadyAction: dockerServerReadyAction,
                removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
            },
            debugLauncherPath: debugConfiguration.debugLauncherPath || launcherPath,
            debugAdapterHost: debugConfiguration.debugAdapterHost || await this.getDebugAdapterHost(context) || '172.17.0.1', // 172.17.0.1 is the default gateway for the bridge network
            console: debugConfiguration.console || "integratedTerminal",
            internalConsoleOptions: debugConfiguration.internalConsoleOptions || "openOnSessionStart",
            module: debugConfiguration.module || pythonRunTaskOptions.module,
            program: debugConfiguration.file || pythonRunTaskOptions.file,
            redirectOutput: debugConfiguration.redirectOutput as boolean | undefined ?? true,
            args: args,
            cwd: '.',

            /* eslint-disable no-template-curly-in-string */
            // These settings control what Python interpreter gets used in what circumstance.
            // debugAdapterPython controls the interpreter used by the Python extension to start the debug adapter, on the local client
            // We want it to use what it would normally use for local Python debugging, i.e. the chosen local interpreter
            debugAdapterPython: '${command:python.interpreterPath}',

            // debugLauncherPython controls the interpreter used by the debug adapter to start the launcher, also on the local client
            // We want it to use what it would normally use for local Python debugging, i.e. the chosen local interpreter
            // This actually launches our launcher in resources/python/launcher.py, which uses `docker exec -d <containerId> python3 /debugpy/launcher ...` to launch the real debugpy launcher in the container
            debugLauncherPython: '${command:python.interpreterPath}',
            /* eslint-enable no-template-curly-in-string */

            // python controls the interpreter used by the launcher to start the application itself
            // Since this is in the container it should always use `python3`
            python: 'python3',
        };
    }

    private getServerReadyPattern(projectType: PythonProjectType): string | undefined {
        switch (projectType) {
            case 'django':
                return 'Starting development server at (https?://\\S+|[0-9]+)';
            case 'fastapi':
                return 'Uvicorn running on (https?://\\S+|[0-9]+)';
            case 'flask':
                return 'Running on (https?://\\S+|[0-9]+)';
            default:
                return undefined;
        }
    }

    private async getDebugAdapterHost(context: DockerDebugContext): Promise<string> {
        // For Windows and Mac we ask debugpy to listen on localhost:{randomPort} and then
        // we use 'host.docker.internal' in the launcher to get the host's ip address.
        if (!isLinux()) {
            return 'localhost';
        }

        // For Docker Desktop on WSL or Linux, we also use 'localhost'
        const dockerInfo = await ext.dockerClient.info(context.actionContext, context.cancellationToken);
        if (/Docker Desktop/i.test(dockerInfo.OperatingSystem)) {
            return 'localhost';
        }

        // For other Docker setups on WSL or Linux, 'host.docker.internal' doesn't work, so we ask debugpy to listen
        // on the bridge network's ip address (predefined network).
        const networkInspection = await ext.dockerClient.inspectNetwork(context.actionContext, 'bridge', context.cancellationToken);

        return networkInspection?.IPAM?.Config?.[0].Gateway;
    }
}

export const pythonDebugHelper = new PythonDebugHelper();
