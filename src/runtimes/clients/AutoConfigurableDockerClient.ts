/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { execAsync } from '../../utils/execAsync';
import { isLinux } from '../../utils/osUtils';
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

        if (ext.outputChannel.debugLoggingEnabled && isLinux()) {
            try {
                ext.outputChannel.debug('');
                ext.outputChannel.debug(`Looking for ${this.commandName} path:`);
                execAsync(`which ${this.commandName}`).catch(() => {/* Do not throw errors */ });
            } catch {
                // Do not throw for diagnostic logging
            }
        }
    }
}
