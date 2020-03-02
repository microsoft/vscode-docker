/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { DialogResponses, IActionContext } from 'vscode-azureextensionui';
import { configurationKeys } from '../../constants';
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { registryExpectedContextValues } from '../../tree/registries/registryContextValues';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';

const defaultRegistryKey = "defaultRegistry";
const hasCheckedRegistryPaths = "hasCheckedRegistryPaths"

export async function setRegistryAsDefault(context: IActionContext, node?: RegistryTreeItemBase): Promise<void> {
    if (!node) {
        node = await ext.registriesTree.showTreeItemPicker<RegistryTreeItemBase>(registryExpectedContextValues.all.registry, context);
    }

    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    await configOptions.update(configurationKeys.defaultRegistryPath, node.baseImagePath, vscode.ConfigurationTarget.Global);
    /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
    vscode.window.showInformationMessage(localize('vscode-docker.commands.registries.settings.updated', 'Updated setting "docker.defaultRegistryPath" to "{0}".', node.baseImagePath));
}

export async function consolidateDefaultRegistrySettings(): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const combineRegistryPaths: boolean = !(ext.context.workspaceState.get(hasCheckedRegistryPaths));
    let defaultRegistryPath: string = configOptions.get(configurationKeys.defaultRegistryPath, '');
    let defaultRegistry: string = configOptions.get(defaultRegistryKey, '');

    if (defaultRegistry && combineRegistryPaths) {
        let updatedPath = defaultRegistryPath ? `${defaultRegistry}/${defaultRegistryPath}` : `${defaultRegistry}`;
        await ext.context.workspaceState.update(hasCheckedRegistryPaths, true);
        await configOptions.update(configurationKeys.defaultRegistryPath, updatedPath, vscode.ConfigurationTarget.Global);
        /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
        vscode.window.showInformationMessage(localize('vscode-docker.commands.registries.settings.defaultRegistryObsolete', 'The \'docker.defaultRegistry\' setting is now obsolete, please use the \'docker.{0}\' setting by itself. Your settings have been updated to reflect this change.', configurationKeys.defaultRegistryPath))
    }
}

export async function askToSaveRegistryPath(imagePath: string, promptForSave?: boolean): Promise<void> {
    let askToSaveKey: string = 'docker.askToSaveRegistryPath';
    let askToSavePath: boolean = promptForSave || ext.context.globalState.get<boolean>(askToSaveKey, true);
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');

    if (!vscode.workspace.workspaceFolders || !vscode.workspace.workspaceFolders.length) {
        // Can't save to workspace settings if no workspace
        return;
    }

    let prefix = "";
    if (imagePath.includes('/')) {
        prefix = imagePath.substring(0, imagePath.lastIndexOf('/'));
    }
    if (prefix && askToSavePath) {
        let userPrefixPreference: vscode.MessageItem = await ext.ui.showWarningMessage(localize('vscode-docker.commands.registries.settings.confirm', 'Would you like to save \'{0}\' as your default registry path?', prefix), DialogResponses.yes, DialogResponses.no, DialogResponses.skipForNow);
        if (userPrefixPreference === DialogResponses.yes || userPrefixPreference === DialogResponses.no) {
            await ext.context.globalState.update(askToSaveKey, false);
        }
        if (userPrefixPreference === DialogResponses.yes) {
            await configOptions.update(configurationKeys.defaultRegistryPath, prefix, vscode.ConfigurationTarget.Workspace);
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            vscode.window.showInformationMessage(localize('vscode-docker.commands.registries.settings.defaultRegistrySaved', 'Default registry path saved to the \'docker.{0}\' setting.', configurationKeys.defaultRegistryPath));
        }
    }
}
