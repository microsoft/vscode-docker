import * as vscode from 'vscode';
import { Event } from 'vscode';

export interface DockerExtensionAPI {
    registerExplorerRegistryProvider(provider: IExplorerRegistryProvider): void;
}

export interface IExplorerRegistryProvider {
    onDidChangeTreeData: vscode.Event<INodeBase>
    getRootNode(): Promise<IRegistryRootNode>;
}

export interface IRegistryRootNode extends INodeBase {
    readonly label: string;
    readonly contextValue: string;
}

export interface INodeBase {
    readonly label: string;
    getTreeItem(): vscode.TreeItem;
    getChildren(element): Promise<INodeBase[]>;
}