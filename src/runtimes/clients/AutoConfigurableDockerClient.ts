/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { DockerClient } from '../docker';
import { AutoConfigurableClient } from './AutoConfigurableClient';

export class AutoConfigurableDockerClient extends DockerClient implements AutoConfigurableClient {
    public constructor() {
        super();
        this.reconfigure();
    }

    public reconfigure(): void {
        const config = vscode.workspace.getConfiguration('docker');
        const dockerCommand = config.get<string | undefined>('dockerPath') || 'docker';
        this.commandName = dockerCommand;

        ext.outputChannel.debug(`docker.dockerPath: ${this.commandName}`);
    }
}
