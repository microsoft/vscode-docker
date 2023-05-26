/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import { CancellationToken, commands, debug, DebugConfiguration, DebugConfigurationProvider, DebugSession, l10n, ProviderResult, workspace, WorkspaceFolder } from 'vscode';
import { DockerOrchestration } from '../constants';
import { ext } from '../extensionVariables';
import { netContainerBuild } from '../scaffolding/wizard/net/netContainerBuild';
import { NetChooseBuildTypeContext } from '../scaffolding/wizard/net/NetSdkChooseBuildStep';
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
                        throw new Error(l10n.t('To debug with Docker you must first open a folder or workspace in VS Code.'));
                    }
                }


                // eslint-disable-next-line no-constant-condition
                // if the user has not created a launch.json yet, we will help them do that
                if (debugConfiguration.type === undefined) { // TODO: Add check for .NET project
                    const netCoreBuildContext: NetChooseBuildTypeContext = { ...actionContext };
                    await netContainerBuild(netCoreBuildContext);

                    if (netCoreBuildContext.containerBuildOptions &&
                        netCoreBuildContext.containerBuildOptions === 'Use .NET SDK') {
                        // set up for .NET SDK build
                        this.configureNetSdkBuild(debugConfiguration);
                    }
                    else {
                        // set up for Dockerfile scaffolding
                        // TODO: Automatically launch after scaffolding is complete
                        await commands.executeCommand('vscode-docker.configure');
                        return undefined;
                    }
                }


                if (!debugConfiguration.request) {
                    throw new Error(l10n.t('The property "request" must be specified in the debug config.'));
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
        context.runDefinition = await getAssociatedDockerRunTask(originalConfiguration, context.folder);
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
            throw new Error(l10n.t('No debug type was resolved.'));
        } else if (!resolvedConfiguration.request) {
            throw new Error(l10n.t('No debug request was resolved.'));
        }
    }

    private getHelper(platform: DockerPlatform): DebugHelper {
        const helper = this.helpers[platform];

        if (!helper) {
            throw new Error(l10n.t('The platform \'{0}\' is not currently supported for Docker debugging.', platform));
        }

        return helper;
    }

    private async removeDebugContainerIfNeeded(context: IActionContext, configuration: ResolvedDebugConfiguration): Promise<void> {
        if ((configuration?.dockerOptions?.removeContainerAfterDebug ?? true) && // removeContainerAfterDebug must be undefined or true
            configuration?.dockerOptions?.containerName && // containerName must be specified
            !(configuration?.subProcessId)) { // Must not have subProcessId, i.e. not a subprocess debug session (which is how Python does hot reload sessions)
            try {
                await ext.runWithDefaults(client =>
                    client.removeContainers({ containers: [configuration.dockerOptions.containerName], force: true })
                );
            } catch {
                // Best effort
            }
        }
    }

    private async outputPortsAtDebuggingIfNeeded(context: IActionContext, configuration: ResolvedDebugConfiguration): Promise<void> {
        if (configuration?.dockerOptions?.containerName) {
            try {
                const inspectInfo = (await ext.runWithDefaults(client =>
                    client.inspectContainers({ containers: [configuration.dockerOptions.containerName] })
                ))?.[0];
                const portMappings: string[] = [];

                for (const binding of inspectInfo?.ports ?? []) {
                    portMappings.push(`localhost:${binding.hostPort} => ${binding.containerPort}`);
                }

                if (portMappings.length > 0) {
                    ext.outputChannel.info(l10n.t('The application is listening on the following port(s) (Host => Container):'));
                    ext.outputChannel.info(portMappings.join('\n'));
                }
            } catch {
                // Best effort
            }
        }
    }

    private configureNetSdkBuild(debugConfiguration: DockerDebugConfiguration): void {
        debugConfiguration.type = 'docker';
        debugConfiguration.request = 'launch';
        debugConfiguration.name = 'Docker .NET Launch';
        debugConfiguration.platform = 'netCore';
        debugConfiguration.netCore = {
            appProject: "${workspaceFolder}/dotnet.csproj"
        };
        debugConfiguration.preLaunchTask = 'dotnet-sdk-run: sdk-debug';
    }
}
