import * as assert from 'assert';
import * as vscode from 'vscode';
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
    await configOptions.update(defaultRegistryPathKey, registryName, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Updated defaultRegistryPath to ${registryName}`);
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
