/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, parseError } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { ContextTreeItem } from '../../../tree/contexts/ContextTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { executeAsTask } from '../../../utils/executeAsTask';
import { execAsync } from '../../../utils/spawnAsync';
import { addImageTaggingTelemetry } from '../../images/tagImage';

export async function deployImageToAci(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RemoteTagTreeItem>([registryExpectedContextValues.dockerHub.tag, registryExpectedContextValues.dockerV2.tag], context);
    }

    const aciContext = await ext.contextsTree.showTreeItemPicker<ContextTreeItem>([/aciContext;/i], context);

    // Switch to the other context if needed
    if (!aciContext.current) {
        await vscode.commands.executeCommand('vscode-docker.contexts.use', aciContext);
    }

    // Log in to the registry to ensure the run actually succeeds
    // If a registry was found/chosen and is still the same as the final tag's registry, try logging in
    await vscode.commands.executeCommand('vscode-docker.registries.logInToDockerCli', node.parent.parent);

    const progressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: localize('vscode-docker.commands.registries.deployImageToAci.gettingPorts', 'Determining ports from image...'),
    };
    const ports = await vscode.window.withProgress(progressOptions, async () => {
        return getImagePorts(node.fullTag);
    });
    const portsArg = ports.map(port => `-p ${port}:${port}`).join(' ');

    addImageTaggingTelemetry(context, node.fullTag, '');

    const command = `docker --context ${aciContext.name} run -d ${portsArg} ${node.fullTag}`;
    const title = localize('vscode-docker.commands.registries.deployImageToAci.deploy', 'Deploy to ACI');
    const options = {
        addDockerEnv: false,
    };

    try {
        await executeAsTask(context, command, title, options);
    } catch {
        // If it fails, try logging in and make one more attempt
        await executeAsTask(context, 'docker login azure', title, options);
        await executeAsTask(context, command, title, options);
    }
}

async function getImagePorts(fullTag: string): Promise<number[]> {
    try {
        const result: number[] = [];

        // 1. Pull the image to the default context
        await execAsync(`docker --context default pull ${fullTag}`);

        // 2. Inspect it in the default context to find out the ports to map
        const { stdout } = await execAsync(`docker --context default inspect ${fullTag} --format="{{ json .Config.ExposedPorts }}"`);

        try {
            const portsJson = <{ [key: string]: never }>JSON.parse(stdout);

            for (const portAndProtocol of Object.keys(portsJson)) {
                const portParts = portAndProtocol.split('/');
                result.push(Number.parseInt(portParts[0], 10));
            }
        } catch { } // Best effort

        return result;
    } catch (err) {
        const error = parseError(err);
        throw new Error(localize('vscode-docker.commands.registries.deployImageToAci.portsError', 'Unable to determine ports to expose. The error is: {0}', error.message));
    }
}
