/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken, WorkspaceFolder } from 'vscode';
import { cloneObject } from '../../utils/cloneObject';
import { DebugHelper } from '../DebugHelper';
import { DockerDebugConfiguration } from '../DockerDebugConfigurationProvider';

export interface NodeDebugOptions {
    foo?: string;
}

export class NodeDebugHelper implements DebugHelper {
    public async provideDebugConfigurations(folder: WorkspaceFolder, options?: NodeDebugOptions): Promise<DockerDebugConfiguration[]> {
        throw new Error('Method not implemented.');
    }

    public async resolveDebugConfiguration(folder: WorkspaceFolder, debugConfiguration: DockerDebugConfiguration, token?: CancellationToken): Promise<DockerDebugConfiguration> {
        const resolvedConfiguration = cloneObject(debugConfiguration);

        // tslint:disable-next-line: no-invalid-template-strings
        resolvedConfiguration.localRoot = '${workspaceFolder}';
        resolvedConfiguration.port = 9229;
        resolvedConfiguration.remoteRoot = '/usr/src/app';
        resolvedConfiguration.request = 'attach';
        resolvedConfiguration.type = 'node2';

        return await Promise.resolve(resolvedConfiguration);
    }
}
