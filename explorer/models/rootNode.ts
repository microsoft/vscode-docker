import * as vscode from 'vscode';
import * as path from 'path';
import { ContainerNode } from './containerNode';
import { docker } from '../../commands/utils/docker-endpoint';
import { ImageNode } from './imageNode';
import { NodeBase } from './nodeBase';
import { RegistryRootNode } from './registryRootNode';
import { AzureAccount } from '../../typings/azure-account.api';

export class RootNode extends NodeBase {
    private _imageCache: Docker.ImageDesc[];
    private _imageDebounceTimer: NodeJS.Timer;
    private _imagesNode: RootNode;
    private _containerCache: Docker.ContainerDesc[];
    private _containerDebounceTimer: NodeJS.Timer;
    private _containersNode: RootNode;
    private _azureAccount: AzureAccount;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public eventEmitter: vscode.EventEmitter<NodeBase>,
        public azureAccount?: AzureAccount
    ) {
        super(label);
        if (this.contextValue === 'imagesRootNode') {
            this._imagesNode = this;
        } else if (this.contextValue === 'containersRootNode') {
            this._containersNode = this;
        }
        this._azureAccount = azureAccount;
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

                if (!this._imageCache) {
                    this._imageCache = images;
                }

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
                    this.eventEmitter.fire(this._imagesNode);
                    this._imageCache = images;
                }

            }, refreshInterval);
        }

    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue
        }

    }

    async getChildren(element): Promise<NodeBase[]> {

        if (element.contextValue === 'imagesRootNode') {
            this.autoRefreshImages();
            return this.getImages();
        }
        if (element.contextValue === 'containersRootNode') {
            this.autoRefreshContainers();
            return this.getContainers();
        }
        if (element.contextValue === 'registriesRootNode') {
            return this.getRegistries()
        }

    }

    private async getImages(): Promise<ImageNode[]> {
        const imageNodes: ImageNode[] = [];
        const images: Docker.ImageDesc[] = await docker.getImageDescriptors();

        if (!images || images.length === 0) {
            return [];
        }

        for (let i = 0; i < images.length; i++) {
            if (!images[i].RepoTags) {
                let node = new ImageNode("<none>:<none>", "localImageNode", this.eventEmitter);
                node.imageDesc = images[i];
                imageNodes.push(node);
            } else {
                for (let j = 0; j < images[i].RepoTags.length; j++) {
                    let node = new ImageNode(images[i].RepoTags[j], "localImageNode", this.eventEmitter);
                    node.imageDesc = images[i];
                    imageNodes.push(node);
                }
            }
        }

        return imageNodes;
    }

    autoRefreshContainers(): void {
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

                if (!this._containerCache) {
                    this._containerCache = containers;
                }

                if (this._containerCache.length !== containers.length) {
                    needToRefresh = true;
                } else {
                    for (let i = 0; i < this._containerCache.length; i++) {
                        let ctr: Docker.ContainerDesc = this._containerCache[i];
                        for (let j = 0; j < containers.length; j++) {
                            // can't do a full object compare because "Status" keeps changing for running containers
                            if (ctr.Id === containers[j].Id &&
                                ctr.Image === containers[j].Image &&
                                ctr.State === containers[j].State) {
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
                    this.eventEmitter.fire(this._containersNode);
                    this._containerCache = containers;
                }

            }, refreshInterval);

        }

    }

    private async getContainers(): Promise<ContainerNode[]> {
        const containerNodes: ContainerNode[] = [];
        let contextValue: string;
        let iconPath: any = {};

        const opts = {
            "filters": {
                "status": ["created", "restarting", "running", "paused", "exited", "dead"]
            }
        };

        const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors(opts);

        if (!containers || containers.length == 0) {
            return [];
        } else {
            for (let i = 0; i < containers.length; i++) {
                if (['exited', 'dead'].includes(containers[i].State)) {
                    contextValue = "stoppedLocalContainerNode";
                    iconPath = {
                        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'stoppedContainer.svg'),
                        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'stoppedContainer.svg')
                    };
                } else {
                    contextValue = "runningLocalContainerNode";
                    iconPath = {
                        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'runningContainer.svg'),
                        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'runningContainer.svg')
                    };
                }

                let containerNode: ContainerNode = new ContainerNode(`${containers[i].Image} (${containers[i].Names[0].substring(1)}) [${containers[i].Status}]`, contextValue, iconPath);
                containerNode.containerDesc = containers[i];
                containerNodes.push(containerNode);

            }
        }
        return containerNodes;
    }

    private async getRegistries(): Promise<RegistryRootNode[]> {
        const registryRootNodes: RegistryRootNode[] = [];

        registryRootNodes.push(new RegistryRootNode('DockerHub', "dockerHubRootNode", null));

        if (this._azureAccount) {
            registryRootNodes.push(new RegistryRootNode('Azure', "azureRegistryRootNode", this.eventEmitter, this._azureAccount));
        }

        return registryRootNodes;
    }
}