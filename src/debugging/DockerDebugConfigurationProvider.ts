/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, callWithTelemetryAndErrorHandling, registerEvent } from '@microsoft/vscode-azext-utils';
import { CancellationToken, DebugConfiguration, DebugConfigurationProvider, DebugSession, MessageItem, ProviderResult, WorkspaceFolder, commands, debug, window, workspace } from 'vscode';
import { DockerOrchestration } from '../constants';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { getAssociatedDockerRunTask } from '../tasks/TaskHelper';
import { DebugHelper, DockerDebugContext, ResolvedDebugConfiguration } from './DebugHelper';
import { DockerPlatform, getPlatform } from './DockerPlatformHelper';
import { NetCoreDockerDebugConfiguration } from './netcore/NetCoreDebugHelper';
import { NodeDockerDebugConfiguration } from './node/NodeDebugHelper';

export interface DockerDebugConfiguration extends NetCoreDockerDebugConfiguration, NodeDockerDebugConfiguration {
    platform?: DockerPlatform;
}

export interface DockerAttachConfiguration extends NetCoreDockerDebugConfiguration, NodeDockerDebugConfiguration {
    processName?: string;
    processId?: string | number;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    public constructor(
        private readonly helpers: { [key in DockerPlatform]: DebugHelper }
    ) {
        // Listen for debug termination events to shut down debug containers as needed
        registerEvent('debugTermination', debug.onDidTerminateDebugSession, async (context: IActionContext, session: DebugSession) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressAll = true;
            await this.removeDebugContainerIfNeeded(context, session.configuration);
        });

        // Listen for debug start events to emit ports being listened on as needed
        registerEvent('debugStart', debug.onDidStartDebugSession, async (context: IActionContext, session: DebugSession) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressAll = true;
            await this.outputPortsAtDebuggingIfNeeded(context, session.configuration);
        });
    }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        const add: MessageItem = { title: localize('vscode-docker.debug.configProvider.addDockerFiles', 'Add Docker Files') };

        // Prompt them to add Docker files since they probably haven't
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        window.showErrorMessage(
            localize('vscode-docker.debug.configProvider.toDebugAddDockerFiles', 'To debug in a Docker container on supported platforms, use the command "Docker: Add Docker Files to Workspace", or click "Add Docker Files".'),
            ...[add])
            .then((result) => {
                if (result === add) {
                    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                    commands.executeCommand('vscode-docker.configure');
                }
            });

        return [];
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        return callWithTelemetryAndErrorHandling(
            debugConfiguration.request === 'attach' ? 'docker-attach' : 'docker-launch',
            async (actionContext: IActionContext) => {
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                ext.activityMeasurementService.recordActivity('overallnoedit');

                if (!folder) {
                    folder = workspace.workspaceFolders?.[0];

                    if (!folder) {
                        actionContext.errorHandling.suppressReportIssue = true;
                        throw new Error(localize('vscode-docker.debug.configProvider.workspaceFolder', 'To debug with Docker you must first open a folder or workspace in VS Code.'));
                    }
                }

                if (debugConfiguration.type === undefined) {
                    // If type is undefined, they may be doing F5 without creating any real launch.json, which won't work
                    // VSCode subsequently will call provideDebugConfigurations which will show an error message
                    return null;
                }

                if (!debugConfiguration.request) {
                    throw new Error(localize('vscode-docker.debug.configProvider.requestRequired', 'The property "request" must be specified in the debug config.'));
                }

                const debugPlatform = getPlatform(debugConfiguration);
                actionContext.telemetry.properties.dockerPlatform = debugPlatform;
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
        context.actionContext.telemetry.properties.runTaskFound = context.runDefinition ? 'true' : 'false';

        const helper = this.getHelper(context.platform);
        const resolvedConfiguration = await helper.resolveDebugConfiguration(context, originalConfiguration);

        if (resolvedConfiguration) {
            await this.validateResolvedConfiguration(resolvedConfiguration);
            await this.removeDebugContainerIfNeeded(context.actionContext, resolvedConfiguration);
        }

        return resolvedConfiguration;
    }

    private async validateResolvedConfiguration(resolvedConfiguration: ResolvedDebugConfiguration): Promise<void> {
        if (!resolvedConfiguration.type) {
            throw new Error(localize('vscode-docker.debug.configProvider.noDebugType', 'No debug type was resolved.'));
        } else if (!resolvedConfiguration.request) {
            throw new Error(localize('vscode-docker.debug.configProvider.noDebugRequest', 'No debug request was resolved.'));
        }
    }

    private getHelper(platform: DockerPlatform): DebugHelper {
        const helper = this.helpers[platform];

        if (!helper) {
            throw new Error(localize('vscode-docker.debug.configProvider.unsupportedPlatform', 'The platform \'{0}\' is not currently supported for Docker debugging.', platform));
        }

        return helper;
    }

    private async removeDebugContainerIfNeeded(context: IActionContext, configuration: ResolvedDebugConfiguration): Promise<void> {
        if ((configuration?.dockerOptions?.removeContainerAfterDebug ?? true) && // removeContainerAfterDebug must be undefined or true
            configuration?.dockerOptions?.containerName && // containerName must be specified
            !(configuration?.subProcessId)) { // Must not have subProcessId, i.e. not a subprocess debug session (which is how Python does hot reload sessions)
            try {
                await ext.dockerClient.removeContainer(context, configuration.dockerOptions.containerName);
            } catch {
                // Best effort
            }
        }
    }

    private async outputPortsAtDebuggingIfNeeded(context: IActionContext, configuration: ResolvedDebugConfiguration): Promise<void> {
        if (configuration?.dockerOptions?.containerName) {
            try {
                const inspectInfo = await ext.dockerClient.inspectContainer(context, configuration.dockerOptions.containerName);
                const portMappings: string[] = [];

                if (inspectInfo?.NetworkSettings?.Ports) {
                    for (const containerPort of Object.keys(inspectInfo.NetworkSettings.Ports)) {
                        const mappings = inspectInfo.NetworkSettings.Ports[containerPort];

                        if (mappings) {
                            for (const mapping of mappings) {
                                if (mapping?.HostPort) {
                                    // TODO: if we ever do non-localhost debugging this would need to change
                                    portMappings.push(`localhost:${mapping.HostPort} => ${containerPort}`);
                                }
                            }
                        }
                    }
                }

                if (portMappings.length > 0) {
                    ext.outputChannel.appendLine(localize('vscode-docker.debug.configProvider.portMappings', 'The application is listening on the following port(s) (Host => Container):'));
                    ext.outputChannel.appendLine(portMappings.join('\n'));
                }
            } catch {
                // Best effort
            }
        }
    }
}
