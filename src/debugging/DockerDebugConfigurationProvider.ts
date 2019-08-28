/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, debug, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { DockerClient } from './coreclr/CliDockerClient';
import { addDebugConfiguration, DebugHelper } from './DebugHelper';
import { DockerPlatform, getPlatform } from './DockerPlatformHelper';
import { NetCoreDebugOptions } from './netcore/NetCoreDebugHelper';
import { NodeDebugOptions } from './node/NodeDebugHelper';

export interface DockerServerReadyAction {
    pattern: string;
    containerName: string;
    uriFormat?: string;
}

export interface DockerDebugConfiguration extends DebugConfiguration {
    preLaunchTask?: string;
    dockerServerReadyAction?: DockerServerReadyAction;
    removeContainerAfterDebug?: boolean;
    netCore?: NetCoreDebugOptions;
    node?: NodeDebugOptions;
    platform: DockerPlatform;
    _containerNameToKill?: string;
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

    // tslint:disable-next-line: no-any
    public async initializeForDebugging(folder: WorkspaceFolder, platform: DockerPlatform, options?: any): Promise<void> {
        options = options || {};

        const helper = this.getHelper(platform);

        const debugConfigurations = await helper.provideDebugConfigurations(folder, options);

        await ext.buildTaskProvider.initializeBuildTasks(folder, platform, options);
        await ext.runTaskProvider.initializeRunTasks(folder, platform, options);

        for (const debugConfiguration of debugConfigurations) {
            await addDebugConfiguration(debugConfiguration);
        }
    }

    private async resolveDebugConfigurationInternal(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, platform: DockerPlatform, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        folder = folder || await quickPickWorkspaceFolder('To debug with Docker you must first open a folder or workspace in VS Code.');

        const helper = this.getHelper(platform);

        const result = await helper.resolveDebugConfiguration(folder, debugConfiguration, token);

        await this.registerRemoveContainerAfterDebugging(result);

        return result;
    }

    private async registerRemoveContainerAfterDebugging(debugConfiguration: DockerDebugConfiguration): Promise<void> {
        if (!debugConfiguration) { // Could be undefined if debugging was cancelled
            return;
        }

        if ((debugConfiguration.removeContainerAfterDebug === undefined || debugConfiguration.removeContainerAfterDebug) &&
            debugConfiguration._containerNameToKill) {

            debugConfiguration.removeContainerAfterDebug = true;
            const disposable = debug.onDidTerminateDebugSession(async session => {
                try {
                    if (session.configuration.removeContainerAfterDebug &&
                        session.configuration._containerNameToKill &&
                        session.configuration._containerNameToKill === debugConfiguration._containerNameToKill) {
                        await this.dockerClient.removeContainer(debugConfiguration._containerNameToKill, { force: true });
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
