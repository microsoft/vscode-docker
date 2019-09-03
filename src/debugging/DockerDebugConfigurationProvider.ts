/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, debug, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { DockerClient } from './coreclr/CliDockerClient';
import { DebugHelper, ResolvedDebugConfiguration } from './DebugHelper';
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
    ) {
    }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return undefined;
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        const debugPlatform = getPlatform(debugConfiguration);
        return callWithTelemetryAndErrorHandling(
            `docker-launch/${debugPlatform || 'unknown'}`,
            async () => await this.resolveDebugConfigurationInternal(folder, debugConfiguration, debugPlatform, token));
    }

    private async resolveDebugConfigurationInternal(folder: WorkspaceFolder | undefined, originalConfiguration: DockerDebugConfiguration, platform: DockerPlatform, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        folder = folder || await quickPickWorkspaceFolder('To debug with Docker you must first open a folder or workspace in VS Code.');

        const helper = this.getHelper(platform);

        const resolvedConfiguration = await helper.resolveDebugConfiguration(folder, originalConfiguration, token);

        if (resolvedConfiguration) {
            await this.registerRemoveContainerAfterDebugging(resolvedConfiguration);
        }

        return resolvedConfiguration;
    }

    private async registerRemoveContainerAfterDebugging(resolvedConfiguration: ResolvedDebugConfiguration): Promise<void> {
        if (resolvedConfiguration.dockerOptions !== undefined
            && (resolvedConfiguration.dockerOptions.removeContainerAfterDebug === undefined || resolvedConfiguration.dockerOptions.removeContainerAfterDebug)
            && resolvedConfiguration.dockerOptions.containerNameToKill !== undefined) {
            const disposable = debug.onDidTerminateDebugSession(async session => {
                const sessionConfiguration = <ResolvedDebugConfiguration>session.configuration;

                try {
                    if (sessionConfiguration
                        && sessionConfiguration.dockerOptions
                        && sessionConfiguration.dockerOptions.containerNameToKill === resolvedConfiguration.dockerOptions.containerNameToKill) {
                        await this.dockerClient.removeContainer(resolvedConfiguration.dockerOptions.containerNameToKill, { force: true });
                        disposable.dispose();
                    } else {
                        return; // Return without disposing--this isn't our debug session
                    }
                } catch {
                    disposable.dispose();
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
