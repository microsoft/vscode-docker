/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as os from 'os';
import * as vscode from 'vscode';
import { localize } from '../../localize';
import { PythonExtensionHelper } from '../../tasks/python/PythonExtensionHelper';
import { PythonDefaultDebugPort, PythonProjectType } from '../../utils/pythonUtils';
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
}

export interface PythonDockerDebugConfiguration extends DockerDebugConfigurationBase {
    python?: PythonDebugOptions;
}

export class PythonDebugHelper implements DebugHelper {
    public constructor(
        private readonly cliDockerClient: CliDockerClient) {
    }

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
        const containerName = inferContainerName(debugConfiguration, context, context.folder.name);

        // Since Python is a special case, we need to ensure the container is removed before attempting to resolve
        // the debug configuration.
        try {
            await this.cliDockerClient.removeContainer(containerName, { force: true });
        } catch { }

        const debuggerLogFilePath = await PythonExtensionHelper.getDebuggerLogFilePath(context.folder.name);
        await fse.remove(debuggerLogFilePath);

        let debuggerReadyPromise = Promise.resolve();
        if (debugConfiguration.preLaunchTask) {
            // There is this limitation with the Python debugger where we need to ensure it's ready before allowing VSCode to attach,
            // if attach happens too soon then it will fail silently. The workaround here is to set the preLaunchTask to undefined,
            // then execute it ourselves with a listener to when it is finished, then wait for the debugger to be ready and return
            // the resolved launch configuration.

            const task = await this.tryGetPreLaunchTask(debugConfiguration.preLaunchTask);

            if (!task) {
                throw new Error(localize('vscode-docker.debug.python.noPreLaunch', 'Unable to find the prelaunch task with the name: {0}', debugConfiguration.preLaunchTask));
            }

            debugConfiguration.preLaunchTask = undefined;
            debuggerReadyPromise = PythonExtensionHelper.ensureDebuggerReady(task, debuggerLogFilePath, containerName, this.cliDockerClient);

            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.tasks.executeTask(task);
        }

        return await debuggerReadyPromise.then(() => {
            return this.resolveDebugConfigurationInternal(debugConfiguration, containerName, context);
        });
    }

    private resolveDebugConfigurationInternal(debugConfiguration: PythonDockerDebugConfiguration, containerName: string, context: DockerDebugContext): ResolvedDebugConfiguration {
        const projectType = debugConfiguration.python.projectType;

        const dockerServerReadyAction =
            resolveDockerServerReadyAction(
                debugConfiguration,
                {
                    containerName: containerName,
                    pattern: this.getServerReadyPattern(projectType),
                    uriFormat: '%s://localhost:%s'
                },
                true);

        // These properties are required by the old debugger, should be changed to normal properties in the configuration
        // as soon as the new debugger is released to 100% of the users.
        const debugOptions = ['FixFilePathCase', 'RedirectOutput', 'ShowReturnValue'];

        if (os.platform() === 'win32') {
            debugOptions.push('WindowsClient');
        }

        return {
            ...debugConfiguration,
            type: 'python',
            request: 'attach',
            workspaceFolder: context.folder.uri.fsPath,
            host: debugConfiguration.python.host || 'localhost',
            port: debugConfiguration.python.port || PythonDefaultDebugPort,
            pathMappings: debugConfiguration.python.pathMappings,
            justMyCode: debugConfiguration.python.justMyCode || true,
            django: debugConfiguration.python.django || projectType === 'django',
            jinja: debugConfiguration.python.jinja || projectType === 'flask',
            dockerOptions: {
                containerName: containerName,
                dockerServerReadyAction: dockerServerReadyAction,
                removeContainerAfterDebug: debugConfiguration.removeContainerAfterDebug
            },
            debugOptions: debugOptions
        };
    }

    private async tryGetPreLaunchTask(prelaunchTaskName: string): Promise<vscode.Task> | undefined {
        if (!prelaunchTaskName) {
            return undefined;
        }

        const tasks = await vscode.tasks.fetchTasks();

        if (tasks) {
            const results = tasks.filter(t => t.name.localeCompare(prelaunchTaskName) === 0);

            if (results.length > 0) {
                return results[0];
            }
        }

        return undefined;
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
}

const dockerClient = new CliDockerClient(new ChildProcessProvider());

export const pythonDebugHelper = new PythonDebugHelper(dockerClient);
