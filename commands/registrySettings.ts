import * as assert from 'assert';
import * as vscode from 'vscode';
import { DialogResponses } from 'vscode-azureextensionui';
import { AzureRegistryNode } from "../explorer/models/azureRegistryNodes";
import { CustomRegistryNode } from "../explorer/models/customRegistryNodes";
import { DockerHubOrgNode } from "../explorer/models/dockerHubNodes";
import { ext } from '../extensionVariables';

const defaultRegistryPathKey = "defaultRegistryPath";
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
    await configOptions.update(defaultRegistryPathKey, registryName, vscode.ConfigurationTarget.Global);
    vscode.window.showInformationMessage(`Updated the docker.defaultRegistryPath setting to ${registryName}`);
}
export async function consolidateDefaultRegistrySettings(): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const combineRegistryPaths: boolean = !(ext.context.workspaceState.get(hasCheckedRegistryPaths));
    let defaultRegistryPath: string = configOptions.get(defaultRegistryPathKey, '');
    let defaultRegistry: string = configOptions.get(defaultRegistryKey, '');

    if (defaultRegistry && combineRegistryPaths) {
        let updatedPath = defaultRegistryPath ? `${defaultRegistry}/${defaultRegistryPath}` : `${defaultRegistry}`;
        await ext.context.workspaceState.update(hasCheckedRegistryPaths, true);
        await configOptions.update(defaultRegistryPathKey, updatedPath, vscode.ConfigurationTarget.Global);
        vscode.window.showInformationMessage("The 'docker.defaultRegistry' setting is now obsolete, and you should just use the 'docker.defaultRegistryPath' setting. Your settings have been updated to reflect this change.")
    }
}

export async function askToSavePrefix(imagePath: string, promptForSave?: boolean): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    let askToSaveRegistryPath: boolean = promptForSave || configOptions.get<boolean>('askToSaveRegistryPath', true);

    let prefix = "";
    if (imagePath.includes('/')) {
        prefix = imagePath.substring(0, imagePath.lastIndexOf('/'));
    }
    if (prefix && askToSaveRegistryPath !== false) {
        let userPrefixPreference: vscode.MessageItem = await ext.ui.showWarningMessage(`Would you like to save '${prefix}' as your default registry path?`, DialogResponses.yes, DialogResponses.no, DialogResponses.skipForNow);
        if (userPrefixPreference === DialogResponses.yes || userPrefixPreference === DialogResponses.no) {
            askToSaveRegistryPath = false;
            await configOptions.update('askToSaveRegistryPath', false, vscode.ConfigurationTarget.Workspace);
        }
        if (userPrefixPreference === DialogResponses.yes) {
            await configOptions.update('defaultRegistryPath', prefix, vscode.ConfigurationTarget.Workspace);
            vscode.window.showInformationMessage('Default registry path saved. You can change this value at any time via the docker.defaultRegistryPath setting.');
        }
    }
}
