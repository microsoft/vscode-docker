import * as vscode from 'vscode';
import { AzureRegistryNode } from "../explorer/models/azureRegistryNodes";
import { CustomRegistryNode } from "../explorer/models/customRegistryNodes";
import { DockerHubOrgNode } from "../explorer/models/dockerHubNodes";

export async function setRegistryAsDefault(node: CustomRegistryNode | AzureRegistryNode | DockerHubOrgNode): Promise<void> {
    let registryName: string;
    if (node instanceof DockerHubOrgNode) {
        registryName = node.namespace;
    } else if (node instanceof AzureRegistryNode) {
        registryName = node.registry.loginServer || node.label;
    } else { //CustomREgistryNode
        registryName = node.registryName;
    }

    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    await configOptions.update('defaultRegistryPath', registryName, vscode.ConfigurationTarget.Workspace);
    vscode.window.showInformationMessage(`Update defaultRegistryPath to ${registryName}`);
}

export async function consolidateDefaultRegistrySettings(): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    let defaultRegistryPath = configOptions.get('defaultRegistryPath', '');
    let defaultRegistry = configOptions.get('defaultRegistry', '');

    if (defaultRegistry) {
        if (defaultRegistryPath) { // combine both the settings, then notify the user
            await configOptions.update('defaultRegistryPath', `${defaultRegistry}/${defaultRegistryPath}`, vscode.ConfigurationTarget.Workspace);
        }
        if (!defaultRegistryPath) {// assign defaultRegistry to defaultRegistryPath
            await configOptions.update('defaultRegistryPath', `${defaultRegistry}`, vscode.ConfigurationTarget.Workspace);
        }
        await configOptions.update('defaultRegistry', undefined, vscode.ConfigurationTarget.Workspace);
        vscode.window.showInformationMessage("The 'docker.defaultRegistry' setting is now obsolete, and you should just use the 'docker.defaultRegistryPath' setting. Your settings have been updated to reflect this change.")
    }
}
