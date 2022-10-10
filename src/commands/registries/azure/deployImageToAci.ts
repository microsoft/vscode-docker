/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem, parseError } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { ContextTreeItem } from '../../../tree/contexts/ContextTreeItem';
import { registryExpectedContextValues } from '../../../tree/registries/registryContextValues';
import { RemoteTagTreeItem } from '../../../tree/registries/RemoteTagTreeItem';
import { execAsync } from '../../../utils/execAsync';
import { addImageTaggingTelemetry } from '../../images/tagImage';
import { executeAciCommandAsTask, throwIfNotInDocker } from '../../../utils/aciUtils';
import { composeArgs, withArg, withNamedArg } from '../../../runtimes/docker';

export async function deployImageToAci(context: IActionContext, node?: RemoteTagTreeItem): Promise<void> {
    await throwIfNotInDocker(context);

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
        return getImagePorts(node.fullTag, context);
    });
    const portsArg = ports.map(port => `-p ${port}:${port}`).join(' ');

    addImageTaggingTelemetry(context, node.fullTag, '');

    const command = await ext.runtimeManager.getCommand();
    const deployArgs = composeArgs(
        withNamedArg('--context', aciContext.name),
        withArg('run'),
        withArg('-d'),
        withArg(portsArg),
        withArg(node.fullTag)
    )();
    const title = localize('vscode-docker.commands.registries.deployImageToAci.deploy', 'Deploy to ACI');

    try {
        await executeAciCommandAsTask(command, deployArgs, title);
    } catch {
        // If it fails, try logging in and make one more attempt
        const loginArgs = composeArgs(
            withArg('login', 'azure'),
            withNamedArg('--cloud-name', await promptForAciCloud(context))
        )();
        await executeAciCommandAsTask(command, loginArgs, title);
        await executeAciCommandAsTask(command, deployArgs, title);
    }
}

async function getImagePorts(fullTag: string, context: IActionContext): Promise<number[]> {
    try {
        const result: number[] = [];

        const command = await ext.runtimeManager.getCommand();

        // 1. Pull the image to the default context
        await execAsync(`${command} --context default pull ${fullTag}`);

        // 2. Inspect it in the default context to find out the ports to map
        const { stdout } = await execAsync(`${command} --context default inspect ${fullTag} --format="{{ json .Config.ExposedPorts }}"`);

        try {
            const portsJson = <{ [key: string]: never }>JSON.parse(stdout);

            for (const portAndProtocol of Object.keys(portsJson)) {
                const portParts = portAndProtocol.split('/');
                result.push(Number.parseInt(portParts[0], 10));
            }
        } catch {
            // Best effort
        }

        return result;
    } catch (err) {
        const error = parseError(err);
        throw new Error(localize('vscode-docker.commands.registries.deployImageToAci.portsError', 'Unable to determine ports to expose. The error is: {0}', error.message));
    }
}

async function promptForAciCloud(context: IActionContext): Promise<string> {
    let result: string;
    const custom = 'custom';

    // Obtained these names from https://github.com/microsoft/vscode-azure-account/blob/78799ce1a3b902aad52744a600b81a2f4fd06380/src/azure-account.ts
    const wellKnownClouds: IAzureQuickPickItem<string>[] = [
        {
            label: localize('vscode-docker.azureUtils.publicCloud', 'Azure'),
            data: 'AzureCloud',
        },
        {
            label: localize('vscode-docker.azureUtils.chinaCloud', 'Azure China'),
            data: 'AzureChinaCloud',
        },
        {
            label: localize('vscode-docker.azureUtils.usGovtCloud', 'Azure US Government'),
            data: 'AzureUSGovernment',
        },
        {
            label: localize('vscode-docker.azureUtils.customCloud', 'Azure Custom Cloud (specify)...'),
            data: custom,
        },
    ];

    const choice = await context.ui.showQuickPick(wellKnownClouds, { placeHolder: localize('vscode-docker.azureUtils.chooseCloud', 'Choose an Azure cloud to log in to') });

    if (choice.data === custom) {
        // The user wants to enter a different cloud name, so prompt with an input box
        result = await context.ui.showInputBox({ prompt: localize('vscode-docker.azureUtils.inputCloudName', 'Enter an Azure cloud name') });
    } else {
        result = choice.data;
    }

    context.telemetry.properties.cloudChoice = result;
    return result;
}
