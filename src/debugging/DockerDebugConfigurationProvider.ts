/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, DebugConfiguration, DebugConfigurationProvider, ProviderResult, WorkspaceFolder } from 'vscode';
import { callWithTelemetryAndErrorHandling } from 'vscode-azureextensionui';
import { Platform } from '../utils/platform';
import { DockerPlatform, getPlatform } from './DockerPlatformHelper';
import { NetCoreDebugHelper, NetCoreDebugOptions } from './netcore/NetCoreDebugHelper';
import { NodeDebugHelper, NodeDebugOptions } from './node/NodeDebugHelper';

export interface DockerServerReadyAction {
    pattern: string;
    containerName: string;
    uriFormat?: string;
}

export interface DockerDebugConfiguration extends DebugConfiguration {
    netCore?: NetCoreDebugOptions;
    node?: NodeDebugOptions;
    platform: DockerPlatform;
    dockerServerReadyAction?: DockerServerReadyAction;
}

export class DockerDebugConfigurationProvider implements DebugConfigurationProvider {
    constructor(
        private readonly netCoreDebugHelper: NetCoreDebugHelper,
        private readonly nodeDebugHelper: NodeDebugHelper
    ) { }

    public provideDebugConfigurations(folder: WorkspaceFolder | undefined, token?: CancellationToken): ProviderResult<DebugConfiguration[]> {
        return undefined;
    }

    public resolveDebugConfiguration(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): ProviderResult<DebugConfiguration | undefined> {
        const debugPlatform = getPlatform(debugConfiguration);
        return callWithTelemetryAndErrorHandling(
            `docker-launch/${debugPlatform || 'unknown'}`,
            async () => await this.resolveDebugConfigurationInternal(folder, debugConfiguration, debugPlatform, token));
    }

    public async initializeForDebugging(folder: WorkspaceFolder, platform: Platform | undefined): Promise<void> {
        throw new Error('Method not implemented');
    }

    private async resolveDebugConfigurationInternal(folder: WorkspaceFolder | undefined, debugConfiguration: DockerDebugConfiguration, debugPlatform: DockerPlatform, token?: CancellationToken): Promise<DockerDebugConfiguration | undefined> {
        switch (debugPlatform) {
            case 'netCore':
                return await this.netCoreDebugHelper.resolveDebugConfiguration(folder, debugConfiguration, token);
            case 'node':
                return await this.nodeDebugHelper.resolveDebugConfiguration(folder, debugConfiguration, token);
            default:
                throw new Error(`Unrecognized platform '${debugConfiguration.platform}'.`);
        }
    }
}
