import * as vscode from 'vscode';
import { NodeBase } from './models/nodeBase';
import { RootNode } from './models/rootNode';

export class DockerExplorerProvider implements vscode.TreeDataProvider<NodeBase> {

    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase> = new vscode.EventEmitter<NodeBase>();
    readonly onDidChangeTreeData: vscode.Event<NodeBase> = this._onDidChangeTreeData.event;
    private _imagesNode: RootNode;
    private _containersNode: RootNode;

    refresh(): void {
        this._onDidChangeTreeData.fire(this._imagesNode);
        this._onDidChangeTreeData.fire(this._containersNode);
    }

    refreshImages(): void {
        this._onDidChangeTreeData.fire(this._imagesNode);
    }

    refreshContainers(): void {
        this._onDidChangeTreeData.fire(this._imagesNode);
    }
    
    getTreeItem(element: NodeBase): vscode.TreeItem {
        return element.getTreeItem();
    }

    async getChildren(element?: NodeBase): Promise<NodeBase[]> {
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

        node = new RootNode('Registries', 'registriesRootNode', this._onDidChangeTreeData);
        rootNodes.push(node);

        return rootNodes;
    }
}
