/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DialogResponses, IActionContext } from '@microsoft/vscode-azext-utils';
import * as fse from 'fs-extra';
import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { RunContainerBindMount } from '../../runtimes/docker';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { getDockerOSType } from '../../utils/osUtils';

export async function runAzureCliImage(context: IActionContext): Promise<void> {
    const osType = await getDockerOSType();
    context.telemetry.properties.dockerOSType = osType;

    if (osType === "windows") {
        const message = l10n.t('Currently, you can only run the Azure CLI when running Linux based containers.');
        if (await vscode.window.showErrorMessage(message, DialogResponses.learnMore) === DialogResponses.learnMore) {
            await vscode.env.openExternal(vscode.Uri.parse('https://docs.docker.com/docker-for-windows/#/switch-between-windows-and-linux-containers'));
        }
    } else {
        const volumes: RunContainerBindMount[] = [];

        await addHomedirFolderVolumeIfExists(volumes, '.azure');
        await addHomedirFolderVolumeIfExists(volumes, '.ssh');
        await addHomedirFolderVolumeIfExists(volumes, '.kube');

        const workspaceFolder = vscode.workspace?.workspaceFolders?.[0];
        if (workspaceFolder) {
            volumes.push({
                source: workspaceFolder.uri.fsPath,
                destination: '/workspace',
                readOnly: false,
                type: 'bind',
            });
        }

        const client = await ext.runtimeManager.getClient();
        const taskCRF = new TaskCommandRunnerFactory(
            {
                taskName: 'Azure CLI',
                focus: true,
            }
        );

        await taskCRF.getCommandRunner()(
            client.runContainer({
                imageRef: 'mcr.microsoft.com/azure-cli:latest',
                removeOnExit: true,
                mounts: volumes,
                interactive: true,
            })
        );
    }
}

async function addHomedirFolderVolumeIfExists(volumes: RunContainerBindMount[], volumeToAdd: '.azure' | '.ssh' | '.kube'): Promise<void> {
    const dir = path.join(os.homedir(), volumeToAdd);

    if (await fse.pathExists(dir)) {
        volumes.push({
            source: dir,
            destination: path.posix.join('/root', volumeToAdd),
            readOnly: false,
            type: 'bind',
        });
    }
}
