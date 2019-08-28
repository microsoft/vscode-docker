/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, debug, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { Platform } from '../utils/platform';
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { ChildProcessProvider } from './coreclr/ChildProcessProvider';
import { CliDockerClient, DockerClient } from './coreclr/CliDockerClient';
import { addDebugConfiguration } from './DebugHelper';
import { NetCoreDebugHelper, NetCoreDebugOptions } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper, NodeDebugOptions } from './node/NodeDebugHelper';

export type DebugPlatform = 'netCore' | 'node' | 'unknown';

export interface DockerServerReadyAction {
    pattern: string;
    containerName: string;
    uriFormat?: string;
}

export interface DockerDebugConfiguration extends DebugConfiguration {
    preLaunchTask?: string;
    dockerServerReadyAction?: DockerServerReadyAction;
    removeContainerAfterDebug?: boolean;
    platform?: DebugPlatform;
    netCore?: NetCoreDebugOptions;
    node?: NodeDebugOptions;
    _containerNameToKill?: string;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    private readonly dockerClient: DockerClient;

    constructor(
        private readonly netCoreDebugHelper: NetCoreDebugHelper,
        private readonly nodeDebugHelper: NodeDebugHelper
    ) {
        this.dockerClient = new CliDockerClient(new ChildProcessProvider());
    }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return undefined;
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        const debugPlatform = DockerDebugConfigurationProvider.determineDebugPlatform(debugConfiguration);
        return callWithTelemetryAndErrorHandling(
            `docker-launch/${debugPlatform}`,
            async () => await this.resolveDebugConfigurationInternal(folder, debugConfiguration, debugPlatform, token));
    }

    // tslint:disable-next-line: no-any
    public async initializeForDebugging(folder: WorkspaceFolder, platform: Platform, options?: any): Promise<void> {
        options = options || {};
        let debugConfigurations: DockerDebugConfiguration[];

        switch (platform) {
            case '.NET Core Console':
            case 'ASP.NET Core':
                // tslint:disable-next-line: no-unsafe-any
                debugConfigurations = await this.netCoreDebugHelper.provideDebugConfigurations(folder, options);
                break;
            case 'Node.js':
                // tslint:disable-next-line: no-unsafe-any
                debugConfigurations = await this.nodeDebugHelper.provideDebugConfigurations(folder, options);
                break;
            default:
                throw new Error(`The platform '${platform}' is not currently supported for Docker debugging.`);
        }

        await ext.buildTaskProvider.initializeBuildTasks(folder, platform, options);
        await ext.runTaskProvider.initializeRunTasks(folder, platform, options);

        for (const debugConfiguration of debugConfigurations) {
            await addDebugConfiguration(debugConfiguration);
        }
    }

    private async resolveDebugConfigurationInternal(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, debugPlatform: DebugPlatform, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        folder = folder || await quickPickWorkspaceFolder('To debug with Docker you must first open a folder or workspace in VS Code.');
        let result: DockerDebugConfiguration | undefined;

        switch (debugPlatform) {
            case 'netCore':
                result = await this.netCoreDebugHelper.resolveDebugConfiguration(folder, debugConfiguration, token);
                break;
            case 'node':
                result = await this.nodeDebugHelper.resolveDebugConfiguration(folder, debugConfiguration, token);
                break;
            default:
                throw new Error(`Unrecognized platform '${debugConfiguration.platform}'.`);
        }

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

    private static determineDebugPlatform(debugConfiguration: DockerDebugConfiguration): DebugPlatform {
        if (debugConfiguration.platform === 'netCore' || debugConfiguration.netCore !== undefined) {
            return 'netCore'
        } else if (debugConfiguration.platform === 'node' || debugConfiguration.node !== undefined) {
            return 'node';
        }

        return 'unknown';
    }
}
