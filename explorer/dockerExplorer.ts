import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { docker } from '../commands/utils/docker-endpoint';

export class DockerExplorerProvider implements vscode.TreeDataProvider<DockerNode> {

    private _onDidChangeTreeData: vscode.EventEmitter<DockerNode | undefined> = new vscode.EventEmitter<DockerNode | undefined>();
    readonly onDidChangeTreeData: vscode.Event<DockerNode | undefined> = this._onDidChangeTreeData.event;
    private _imagesNode: DockerNode;
    private _containersNode: DockerNode;

    refresh(): void {
        this.refreshImages(false)
        this.refreshContainers(false)
    }

    refreshImages(delay: boolean): void {
        if (delay) {
            setTimeout(() => {
                this._onDidChangeTreeData.fire(this._imagesNode);
            }, 5000);
        } else {
            this._onDidChangeTreeData.fire(this._imagesNode);
        }
    }

    refreshContainers(delay: boolean): void {
        if (delay) {
            setTimeout(() => {
                this._onDidChangeTreeData.fire(this._containersNode);
            }, 5000);
        } else {
            this._onDidChangeTreeData.fire(this._containersNode);
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
                    if (error.code === "ENOENT") {
                        vscode.window.showErrorMessage('Unable to connect to Docker, is the service running?');
                    }
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
                    if (error.code === "ENOENT") {
                        vscode.window.showErrorMessage('Unable to connect to Docker, is the service running?');
                    }
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