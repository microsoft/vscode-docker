import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { docker } from '../commands/utils/docker-endpoint';

export class DockerExplorerProvider implements vscode.TreeDataProvider<DockerNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<DockerNode | undefined> = new vscode.EventEmitter<DockerNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<DockerNode | undefined> = this._onDidChangeTreeData.event;
    private _imagesNode: DockerNode;
    private _containersNode: DockerNode;
    private _imageCache: Docker.ImageDesc[];
    private _containerCache: Docker.ContainerDesc[];
    private _imageDebounceTimer: NodeJS.Timer;
    private _containerDebounceTimer: NodeJS.Timer;

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

    autoRefreshImages(): void {

        const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
        const refreshInterval: number = configOptions.get<number>('explorerRefreshInterval', 1000);

        // https://github.com/Microsoft/vscode/issues/30535
        // if (this._imagesNode.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
        //     clearInterval(this._imageDebounceTimer);
        //     return;
        // }

        clearInterval(this._imageDebounceTimer);

        if (refreshInterval > 0) {
            this._imageDebounceTimer = setInterval(async () => {

                const opts = {
                    "filters": {
                        "dangling": ["false"]
                    }
                };

                let needToRefresh: boolean = false;
                let found: boolean = false;

                const images: Docker.ImageDesc[] = await docker.getImageDescriptors(opts);

                if (this._imageCache.length !== images.length) {
                    needToRefresh = true;
                } else {
                    for (let i: number = 0; i < this._imageCache.length; i++) {
                        let before: string = JSON.stringify(this._imageCache[i]);
                        for (let j: number = 0; j < images.length; j++) {
                            let after: string = JSON.stringify(images[j]);
                            if (before === after) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            needToRefresh = true;
                            break
                        }
                    }
                }

                if (needToRefresh) {
                    this._onDidChangeTreeData.fire(this._imagesNode);
                    this._imageCache = images;
                }

            }, refreshInterval);
        }

    }

    containersAutoRefresh(): void {
        const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
        const refreshInterval = configOptions.get('explorerRefreshInterval', 1000);

        // https://github.com/Microsoft/vscode/issues/30535
        // if (this._containersNode.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
        //     clearInterval(this._containerDebounceTimer);
        //     return;
        // }

        clearInterval(this._containerDebounceTimer);

        if (refreshInterval > 0) {
            this._containerDebounceTimer = setInterval(async () => {

                const opts = {
                    "filters": {
                        "status": ["created", "restarting", "running", "paused", "exited", "dead"]
                    }
                };

                let needToRefresh: boolean = false;
                let found: boolean = false;

                const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors(opts);

                if (this._containerCache.length !== containers.length) {
                    needToRefresh = true;
                } else {
                    for (let i = 0; i < this._containerCache.length; i++) {
                        let img: Docker.ContainerDesc = this._containerCache[i];
                        for (let j = 0; j < containers.length; j++) {
                            // can't do a full object compare because "Status" keeps changing for running containers
                            if (img.Id === containers[j].Id &&
                                img.Image === containers[j].Image &&
                                img.State === containers[j].State) {
                                found = true;
                                break;
                            }
                        }

                        if (!found) {
                            needToRefresh = true;
                            break
                        }
                    }
                }

                if (needToRefresh) {
                    this._onDidChangeTreeData.fire(this._containersNode);
                    this._containerCache = containers;
                }

            }, refreshInterval);

        }

    }

    getTreeItem(element: DockerNode): vscode.TreeItem {
        return element;
    }

    async getChildren(element?: DockerNode): Promise<DockerNode[]> {
        return this.getDockerNodes(element);
    }

    private async getDockerNodes(element?: DockerNode): Promise<DockerNode[]> {
        let iconPath: any = {};
        let contextValue: string = "";
        let node: DockerNode;
        const nodes: DockerNode[] = [];

        if (!element) {
            this._imagesNode = new DockerNode('Images', vscode.TreeItemCollapsibleState.Collapsed, 'rootImages', null);
            this._containersNode = new DockerNode('Containers', vscode.TreeItemCollapsibleState.Collapsed, 'rootContainers', null);
            nodes.push(this._imagesNode);
            nodes.push(this._containersNode);
        } else {

            if (element.contextValue === 'rootImages') {

                let opts = {
                    "filters": {
                        "dangling": ["false"]
                    }
                };

                try {
                    const images: Docker.ImageDesc[] = await docker.getImageDescriptors(opts);
                    this._imageCache = images;
                    this.autoRefreshImages();

                    if (!images || images.length == 0) {
                        return [];
                    } else {
                        iconPath = {
                            light: path.join(__filename, '..', '..', '..', 'images', 'light', 'application.svg'),
                            dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'application.svg')
                        };
                        for (let i = 0; i < images.length; i++) {
                            contextValue = "dockerImage";
                            if (!images[i].RepoTags) {
                                let node = new DockerNode("<none>:<none>", vscode.TreeItemCollapsibleState.None, contextValue, iconPath);
                                node.imageDesc = images[i];
                                nodes.push(node);
                            } else {
                                for (let j = 0; j < images[i].RepoTags.length; j++) {
                                    let node = new DockerNode(images[i].RepoTags[j], vscode.TreeItemCollapsibleState.None, contextValue, iconPath);
                                    node.imageDesc = images[i];
                                    nodes.push(node);
                                }
                            }
                        }
                    }
                } catch (error) {
                    vscode.window.showErrorMessage('Unable to connect to Docker, is the Docker daemon running?');
                    console.log(error);
                }
            }

            if (element.contextValue === 'rootContainers') {

                let opts = {
                    "filters": {
                        "status": ["created", "restarting", "running", "paused", "exited", "dead"]
                    }
                };

                try {

                    const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors(opts);
                    this._containerCache = containers;
                    this.containersAutoRefresh();

                    if (!containers || containers.length == 0) {
                        return [];
                    } else {
                        for (let i = 0; i < containers.length; i++) {
                            if (['exited', 'dead'].includes(containers[i].State)) {
                                contextValue = "dockerContainerStopped";
                                iconPath = {
                                    light: path.join(__filename, '..', '..', '..', 'images', 'light', 'stoppedContainer.svg'),
                                    dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'stoppedContainer.svg')
                                };
                            } else {
                                contextValue = "dockerContainerRunning";
                                iconPath = {
                                    light: path.join(__filename, '..', '..', '..', 'images', 'light', 'runningContainer.svg'),
                                    dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'runningContainer.svg')
                                };
                            }

                            const containerName = containers[i].Names[0].substring(1);
                            let node = new DockerNode(`${containers[i].Image} (${containerName}) [${containers[i].Status}]`, vscode.TreeItemCollapsibleState.None, contextValue, iconPath);
                            node.containerDesc = containers[i];
                            nodes.push(node);

                        }
                    }
                } catch (error) {
                    vscode.window.showErrorMessage('Unable to connect to Docker, is the Docker daemon running?');
                    console.log(error);
                }
            }
        }
        return nodes;
    }
}

export class DockerNode extends vscode.TreeItem {

    constructor(public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly iconPath: any
    ) {

        super(label, collapsibleState);
    }

    public containerDesc: Docker.ContainerDesc;
    public imageDesc: Docker.ImageDesc;

}