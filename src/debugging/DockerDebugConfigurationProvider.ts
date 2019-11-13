/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, commands, debug, DebugConfiguration, DebugConfigurationProvider, MessageItem, ProviderResult, window, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { DockerOrchestration } from '../constants';
import { getAssociatedDockerRunTask } from '../tasks/TaskHelper';
import { DockerClient } from './coreclr/CliDockerClient';
import { DebugHelper, DockerDebugContext, ResolvedDebugConfiguration } from './DebugHelper';
import { DockerPlatform, getPlatform } from './DockerPlatformHelper';
import { NetCoreDockerDebugConfiguration } from './netcore/NetCoreDebugHelper';
import { NodeDockerDebugConfiguration } from './node/NodeDebugHelper';

export interface DockerDebugConfiguration extends NetCoreDockerDebugConfiguration, NodeDockerDebugConfiguration {
    platform?: DockerPlatform;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    constructor(
        private readonly dockerClient: DockerClient,
        private readonly helpers: { [key in DockerPlatform]: DebugHelper }
    ) { }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        const add: MessageItem = { title: 'Add Docker Files' };

        // Prompt them to add Docker files since they probably haven't
        window.showErrorMessage(
            'To debug in a Docker container on supported platforms, use the command \"Docker: Add Docker Files to Workspace\", or click the button below.',
            ...[add]).then((result) => {
                if (result === add) {
                    commands.executeCommand('vscode-docker.configure');
                }
            });

        return [];
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        return callWithTelemetryAndErrorHandling(
            'docker-launch',
            async (actionContext: IActionContext) => {
                if (!folder) {
                    throw new Error('To debug with Docker you must first open a folder or workspace in VS Code.');
                }

                if (debugConfiguration.type === undefined) {
                    // If type is undefined, they may be doing F5 without creating any real launch.json, which won't work
                    // VSCode subsequently will call provideDebugConfigurations which will show an error message
                    return null;
                }

                const debugPlatform = getPlatform(debugConfiguration);
                actionContext.telemetry.properties.platform = debugPlatform;
                actionContext.telemetry.properties.orchestration = 'single' as DockerOrchestration; // TODO: docker-compose, when support is added

                return await this.resolveDebugConfigurationInternal(
                    {
                        folder: folder,
                        platform: debugPlatform,
                        actionContext: actionContext,
                        cancellationToken: token,
                    },
                    debugConfiguration
                );
            }
        );
    }

    private async resolveDebugConfigurationInternal(context: DockerDebugContext, originalConfiguration: DockerDebugConfiguration): Promise<DockerDebugConfiguration | undefined> {
        context.runDefinition = await getAssociatedDockerRunTask(originalConfiguration);

        const helper = this.getHelper(context.platform);
        const resolvedConfiguration = await helper.resolveDebugConfiguration(context, originalConfiguration);

        if (resolvedConfiguration) {
            await this.validateResolvedConfiguration(resolvedConfiguration);
            await this.registerRemoveContainerAfterDebugging(resolvedConfiguration);
        }

        return resolvedConfiguration;
    }

    private async validateResolvedConfiguration(resolvedConfiguration: ResolvedDebugConfiguration): Promise<void> {
        if (!resolvedConfiguration.type) {
            throw new Error('No debug type was resolved.');
        } else if (!resolvedConfiguration.request) {
            throw new Error('No debug request was resolved.');
        }
    }

    private async registerRemoveContainerAfterDebugging(resolvedConfiguration: ResolvedDebugConfiguration): Promise<void> {
        if (resolvedConfiguration.dockerOptions
            && (resolvedConfiguration.dockerOptions.removeContainerAfterDebug === undefined || resolvedConfiguration.dockerOptions.removeContainerAfterDebug)
            && resolvedConfiguration.dockerOptions.containerNameToKill) {
            try {
                await this.dockerClient.removeContainer(resolvedConfiguration.dockerOptions.containerNameToKill, { force: true });
            } catch { }

            // Now register the container for removal after the debug session ends
            const disposable = debug.onDidTerminateDebugSession(async session => {
                const sessionConfiguration = <ResolvedDebugConfiguration>session.configuration;

                if (sessionConfiguration
                    && sessionConfiguration.dockerOptions
                    && sessionConfiguration.dockerOptions.containerNameToKill === resolvedConfiguration.dockerOptions.containerNameToKill) {
                    try {
                        await this.dockerClient.removeContainer(resolvedConfiguration.dockerOptions.containerNameToKill, { force: true });
                    } finally {
                        disposable.dispose();
                    }
                } else {
                    return; // Return without disposing--this isn't our debug session
                }
            });
        }
    }

    private getHelper(platform: DockerPlatform): DebugHelper {
        const helper = this.helpers[platform];

        if (!helper) {
            throw new Error(`The platform '${platform}' is not currently supported for Docker debugging.`);
        }

        return helper;
    }
}
