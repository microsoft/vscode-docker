import * as assert from 'assert';
import * as vscode from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';
import { configurationKeys } from '../constants';
import { AzureRegistryNode } from "../explorer/models/azureRegistryNodes";
import { CustomRegistryNode } from "../explorer/models/customRegistryNodes";
import { DockerHubOrgNode } from "../explorer/models/dockerHubNodes";
import { ext } from '../extensionVariables';

const defaultRegistryKey = "defaultRegistry";
const hasCheckedRegistryPaths = "hasCheckedRegistryPaths"

export async function setRegistryAsDefault(node: CustomRegistryNode | AzureRegistryNode | DockerHubOrgNode): Promise<void> {
    let registryName: string;
    if (node instanceof DockerHubOrgNode) {
        registryName = node.namespace;
    } else if (node instanceof AzureRegistryNode) {
        registryName = node.registry.loginServer || node.label;
    } else if (node instanceof CustomRegistryNode) {
        registryName = node.registryName;
    } else {
        assert.fail("Type of registry node encountered not handled");
    }

    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    await configOptions.update(configurationKeys.defaultRegistryPath, registryName, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Updated the docker.defaultRegistryPath setting to ${registryName}`);
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
        vscode.window.showInformationMessage(`The 'docker.defaultRegistry' setting is now obsolete, please use the 'docker.${configurationKeys.defaultRegistryPath}' setting by itself. Your settings have been updated to reflect this change.`)
    }
}

export async function askToSaveRegistryPath(imagePath: string, promptForSave?: boolean): Promise<void> {
    let askToSaveKey: string = 'docker.askToSaveRegistryPath';
    let askToSavePath: boolean = promptForSave || ext.context.globalState.get<boolean>(askToSaveKey, true);
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');

    let prefix = "";
    if (imagePath.includes('/')) {
        prefix = imagePath.substring(0, imagePath.lastIndexOf('/'));
    }
    if (prefix && askToSavePath) {
        let userPrefixPreference: vscode.MessageItem = await ext.ui.showWarningMessage(`Would you like to save '${prefix}' as your default registry path?`, DialogResponses.yes, DialogResponses.no, DialogResponses.skipForNow);
        if (userPrefixPreference === DialogResponses.yes || userPrefixPreference === DialogResponses.no) {
            await ext.context.globalState.update(askToSaveKey, false);
        }
        if (userPrefixPreference === DialogResponses.yes) {
            await configOptions.update(configurationKeys.defaultRegistryPath, prefix, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage(`Default registry path saved to the 'docker.${configurationKeys.defaultRegistryPath}' setting.`);
        }
    }
}
