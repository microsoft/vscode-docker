/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { docker } from '../../commands/utils/docker-endpoint';
import { AzureAccount } from '../../typings/azure-account.api';
import { ContainerNode, ContainerNodeContextValue } from './containerNode';
import { ImageNode } from './imageNode';
import { IconPath, NodeBase } from './nodeBase';
import { RegistryRootNode } from './registryRootNode';

const imageFilters = {
    "filters": {
        "dangling": ["false"]
    }
};

const containerFilters = {
    "filters": {
        "status": ["created", "restarting", "running", "paused", "exited", "dead"]
    }
};

export class RootNode extends NodeBase {
    private _sortedImageCache: Docker.ImageDesc[] | undefined;
    private _imageDebounceTimer: NodeJS.Timer | undefined;
    private _imagesNode: RootNode | undefined;
    private _containerCache: Docker.ContainerDesc[] | undefined;
    private _containerDebounceTimer: NodeJS.Timer | undefined;
    private _containersNode: RootNode | undefined;
    private _azureAccount: AzureAccount | undefined;

    constructor(
        public readonly label: string,
        public readonly contextValue: 'imagesRootNode' | 'containersRootNode' | 'registriesRootNode',
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

    public autoRefreshImages(): void {
        const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
        const refreshInterval: number = configOptions.get<number>('explorerRefreshInterval', 1000);

        // https://github.com/Microsoft/vscode/issues/30535
        // if (this._imagesNode.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
        //     clearInterval(this._imageDebounceTimer);
        //     return;
        // }

        if (this._imageDebounceTimer) {
            clearInterval(this._imageDebounceTimer);
        }

        if (refreshInterval > 0) {
            this._imageDebounceTimer = setInterval(async () => {
                let needToRefresh: boolean = false;
                let found: boolean = false;

                const images: Docker.ImageDesc[] = await docker.getImageDescriptors(imageFilters);
                images.sort((img1, img2) => {
                    if (img1.Id > img2.Id) {
                        return -1;
                    } else if (img1.Id < img2.Id) {
                        return 1;
                    } else {
                        return 0;
                    }
                });

                if (!this._sortedImageCache) {
                    this._sortedImageCache = images;
                    return;
                }

                let imagesAsJson = JSON.stringify(images);
                let cacheAsJson = JSON.stringify(this._sortedImageCache);
                if (imagesAsJson !== cacheAsJson) {
                    this.eventEmitter.fire(this._imagesNode);
                    this._sortedImageCache = images;
                }

            }, refreshInterval);
        }

    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue
        }

    }

    public async getChildren(element: NodeBase): Promise<NodeBase[]> {

        if (element.contextValue === 'imagesRootNode') {
            return this.getImages();
        }
        if (element.contextValue === 'containersRootNode') {
            return this.getContainers();
        }
        if (element.contextValue === 'registriesRootNode') {
            return this.getRegistries()
        }

        throw new Error(`Unexpected contextValue ${element.contextValue}`);
    }

    private async getImages(): Promise<ImageNode[]> {
        const imageNodes: ImageNode[] = [];
        let images: Docker.ImageDesc[];

        try {
            images = await docker.getImageDescriptors(imageFilters);
            if (!images || images.length === 0) {
                return [];
            }

            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let i = 0; i < images.length; i++) {
                // tslint:disable-next-line:prefer-for-of // Grandfathered in
                if (!images[i].RepoTags) {
                    let node = new ImageNode(`<none>:<none>`, images[i], this.eventEmitter);
                    imageNodes.push(node);
                } else {
                    // tslint:disable-next-line:prefer-for-of // Grandfathered in
                    for (let j = 0; j < images[i].RepoTags.length; j++) {
                        // tslint:disable-next-line:prefer-for-of // Grandfathered in
                        let node = new ImageNode(`${images[i].RepoTags[j]}`, images[i], this.eventEmitter);
                        imageNodes.push(node);
                    }
                }
            }
        } catch (error) {
            vscode.window.showErrorMessage('Unable to connect to Docker, is the Docker daemon running?');
            return [];
        }

        this.autoRefreshImages();

        return imageNodes;
    }

    public autoRefreshContainers(): void {
        const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
        const refreshInterval = configOptions.get('explorerRefreshInterval', 1000);

        // https://github.com/Microsoft/vscode/issues/30535
        // if (this._containersNode.collapsibleState === vscode.TreeItemCollapsibleState.Collapsed) {
        //     clearInterval(this._containerDebounceTimer);
        //     return;
        // }

        if (this._containerDebounceTimer) {
            clearInterval(this._containerDebounceTimer);
        }

        if (refreshInterval > 0) {
            this._containerDebounceTimer = setInterval(async () => {

                let needToRefresh: boolean = false;
                let found: boolean = false;

                const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors(containerFilters);

                if (!this._containerCache) {
                    this._containerCache = containers;
                }

                if (this._containerCache.length !== containers.length) {
                    needToRefresh = true;
                } else {
                    // tslint:disable-next-line:prefer-for-of // Grandfathered in
                    for (let i = 0; i < this._containerCache.length; i++) {
                        let ctr: Docker.ContainerDesc = this._containerCache[i];
                        // tslint:disable-next-line:prefer-for-of // Grandfathered in
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
        let containers: Docker.ContainerDesc[];
        let contextValue: ContainerNodeContextValue;
        let iconPath: IconPath;

        try {
            containers = await docker.getContainerDescriptors(containerFilters);
            if (!containers || containers.length === 0) {
                return [];
            }

            // tslint:disable-next-line:prefer-for-of // Grandfathered in
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

                let containerNode: ContainerNode = new ContainerNode(`${containers[i].Image} (${containers[i].Names[0].substring(1)}) (${containers[i].Status})`, containers[i], contextValue, iconPath);
                containerNodes.push(containerNode);
            }

        } catch (error) {
            vscode.window.showErrorMessage('Unable to connect to Docker, is the Docker daemon running?');
            return [];
        }

        this.autoRefreshContainers();

        return containerNodes;
    }

    private async getRegistries(): Promise<RegistryRootNode[]> {
        const registryRootNodes: RegistryRootNode[] = [];

        registryRootNodes.push(new RegistryRootNode('Docker Hub', "dockerHubRootNode"));

        if (this._azureAccount) {
            registryRootNodes.push(new RegistryRootNode('Azure', "azureRegistryRootNode", this.eventEmitter, this._azureAccount));
        }

        registryRootNodes.push(new RegistryRootNode('Private Registries', 'customRootNode'));

        return registryRootNodes;
    }
}
