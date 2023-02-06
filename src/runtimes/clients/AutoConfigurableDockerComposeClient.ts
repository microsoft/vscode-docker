/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ext } from '../../extensionVariables';
import { execAsync } from '../../utils/execAsync';
import { AsyncLazy } from '../../utils/lazy';
import { DockerComposeClient, IContainerOrchestratorClient } from '../docker';
import { isDockerComposeClient } from '../OrchestratorRuntimeManager';
import { AutoConfigurableClient } from './AutoConfigurableClient';

interface ComposeConfig {
    commandName: string;
    composeV2: boolean;
}

export class AutoConfigurableDockerComposeClient extends DockerComposeClient implements AutoConfigurableClient {
    private readonly composeConfigLazy = new AsyncLazy<ComposeConfig>(() => this.detectComposeConfig());

    public constructor() {
        super();
        this.reconfigure();
    }

    public reconfigure(): void {
        this.composeConfigLazy.clear();
    }

    public async slowConfigure(): Promise<void> {
        const config = await this.composeConfigLazy.getValue();
        this.commandName = config.commandName;
        this.composeV2 = config.composeV2;
    }

    private async detectComposeConfig(): Promise<ComposeConfig> {
        const config = vscode.workspace.getConfiguration('docker');

        let composeCommand = config.get<string | undefined>('composeCommand');

        if (composeCommand) {
            // User has explicitly set a compose command, so we will respect it

            let isComposeV2 = false;
            if (/^docker(\s+compose\s*)?$/i.test(composeCommand)) {
                // Normalize both "docker" and "docker compose" to "docker", with `isComposeV2` true
                composeCommand = 'docker';
                isComposeV2 = true;
            }

            return {
                commandName: composeCommand,
                composeV2: isComposeV2,
            };
        } else {
            // User has not set a compose command, so we will attempt to autodetect it

            try {
                ext.outputChannel.info('Attempting to autodetect Docker Compose command...');
                await execAsync('docker compose version');

                // If successful, then assume we can use compose V2
                return {
                    commandName: 'docker',
                    composeV2: true,
                };
            } catch {
                // Do nothing
            }

            return {
                commandName: 'docker-compose',
                composeV2: false,
            };
        }
    }
}

export function isAutoConfigurableDockerComposeClient(maybeClient: IContainerOrchestratorClient): maybeClient is AutoConfigurableDockerComposeClient {
    return isDockerComposeClient(maybeClient) &&
        typeof (maybeClient as AutoConfigurableDockerComposeClient).slowConfigure === 'function';
}
