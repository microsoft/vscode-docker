import * as vscode from 'vscode';
import { docker } from '../commands/utils/docker-endpoint';
import { AzureAccount } from '../typings/azure-account.api';
import { NodeBase } from './models/nodeBase';
import { RootNode } from './models/rootNode';

export class DockerExplorerProvider implements vscode.TreeDataProvider<NodeBase> {

    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase> = new vscode.EventEmitter<NodeBase>();
    public readonly onDidChangeTreeData: vscode.Event<NodeBase> = this._onDidChangeTreeData.event;
    private _imagesNode: RootNode;
    private _containersNode: RootNode;
    private _registriesNode: RootNode
    private _azureAccount: AzureAccount;

    constructor(azureAccount: AzureAccount) {
        this._azureAccount = azureAccount;
    }

    public refresh(): void {
        this._onDidChangeTreeData.fire(this._imagesNode);
        this._onDidChangeTreeData.fire(this._containersNode);
        this._onDidChangeTreeData.fire(this._registriesNode);
    }

    public refreshImages(): void {
        this._onDidChangeTreeData.fire(this._imagesNode);
    }

    public refreshContainers(): void {
        this._onDidChangeTreeData.fire(this._imagesNode);
    }

    public refreshRegistries(): void {
        this._onDidChangeTreeData.fire(this._registriesNode);
    }

    public getTreeItem(element: NodeBase): vscode.TreeItem {
        return element.getTreeItem();
    }

    public async getChildren(element?: NodeBase): Promise<NodeBase[]> {
        if (!element) {
            return this.getRootNodes();
        }
        return element.getChildren(element);
    }

    private async getRootNodes(): Promise<RootNode[]> {
        const rootNodes: RootNode[] = [];
        let node: RootNode;

        node = new RootNode('Images', 'imagesRootNode', this._onDidChangeTreeData);
        this._imagesNode = node;
        rootNodes.push(node);

        node = new RootNode('Containers', 'containersRootNode', this._onDidChangeTreeData);
        this._containersNode = node;
        rootNodes.push(node);

        node = new RootNode('Registries', 'registriesRootNode', this._onDidChangeTreeData, this._azureAccount);
        this._registriesNode = node;
        rootNodes.push(node);

        return rootNodes;
    }
}
