/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { callWithTelemetryAndErrorHandling, IActionContext, registerEvent } from '@microsoft/vscode-azext-utils';
import { CancellationToken, commands, debug, DebugConfiguration, DebugConfigurationProvider, DebugSession, l10n, ProviderResult, workspace, WorkspaceFolder } from 'vscode';
import { CSPROJ_GLOB_PATTERN, DockerOrchestration } from '../constants';
import { ext } from '../extensionVariables';
import { getAssociatedDockerRunTask } from '../tasks/TaskHelper';
import { resolveFilesOfPattern } from '../utils/quickPickFile';
import { DebugHelper, DockerDebugContext, ResolvedDebugConfiguration } from './DebugHelper';
import { DockerPlatform, getPlatform } from './DockerPlatformHelper';
import { NetCoreDockerDebugConfiguration } from './netcore/NetCoreDebugHelper';
import { netSdkDebugHelper } from './netSdk/NetSdkDebugHelper';
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

        // let's only do NET SDK for now
        // return callWithTelemetryAndErrorHandling(
        //     'docker-provideDebugConfigurations', //TODO: change this later
        //     async (actionContext: IActionContext) => {
        //         return this.handleEmptyDebugConfig(folder, actionContext);
        //     }
        // );

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

                if (debugConfiguration.type === undefined &&
                    debugConfiguration.request === undefined &&
                    debugConfiguration.name === undefined) {
                    const netConfig = await this.handleEmptyDebugConfig(folder, actionContext);
                    this.copyDebugConfiguration(netConfig[0], debugConfiguration);
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

    // write a method that takes in two DockerDebugConfiguration and copy the properties from the second one to the first one
    private copyDebugConfiguration(from: DockerDebugConfiguration, to: DockerDebugConfiguration): void {
        for (const key of Object.keys(from)) {
            if (from[key] !== undefined) {
                to[key] = from[key];
            }
        }
    }

    /**
     * If the user has an empty debug launch.json, then we will:
     *  1. check if it's a .NET Core project, if so, we will provide .NET Core debug configurations
     *  2. otherwise, we will scaffold docker files
     */
    public async handleEmptyDebugConfig(folder: WorkspaceFolder, actionContext: IActionContext): Promise<DockerDebugConfiguration[]> {

        // NOTE: we can not determine which helper it is by DockerDebugContext, so we need to basically check the
        //       type of files inside the folder here. let's only do it for .NET Core for now, we can add more later

        // check if it's a .NET Core project
        const csProjUris = await resolveFilesOfPattern(folder, [CSPROJ_GLOB_PATTERN]);
        if (csProjUris) {
            return await netSdkDebugHelper.provideDebugConfigurations(
                {
                    actionContext,
                    dockerfile: undefined,
                    folder: folder
                },
                {
                    appProject: csProjUris[0].absoluteFilePath,
                });
        }
        else {
            // scaffold docker files
            await commands.executeCommand('vscode-docker.configure');
            return [];
        }
    }
}
