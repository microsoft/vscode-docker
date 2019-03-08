/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as path from 'path';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { docker, ListContainerDescOptions as GetContainerDescOptions } from '../../commands/utils/docker-endpoint';
import { imagesPath } from '../../constants';
import { ext, ImageGrouping } from '../../extensionVariables';
import { AzureAccount } from '../../typings/azure-account.api';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import { showDockerConnectionError } from '../utils/dockerConnectionError';
import { ContainerNode, ContainerNodeContextValue } from './containerNode';
import { ErrorNode } from './errorNode';
import { getContainerLabel } from './getContainerLabel';
import { getImageLabel } from './getImageLabel';
import { ImageGroupNode } from './imageGroupNode';
import { ImageNode } from './imageNode';
import { IconPath, NodeBase } from './nodeBase';
import { RegistryRootNode } from './registryRootNode';

const imageFilters = {
    "filters": {
        "dangling": ["false"]
    }
};

const containerFilters: GetContainerDescOptions = {
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

    constructor(
        public readonly label: string,
        public readonly contextValue: 'imagesRootNode' | 'containersRootNode' | 'registriesRootNode',
        public eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label);
        if (this.isImages) {
            this._imagesNode = this;
        } else if (this.isContainers) {
            this._containersNode = this;
        }
    }

    private get isImages(): boolean {
        return this.contextValue === "imagesRootNode";
    }

    private get isContainers(): boolean {
        return this.contextValue === "containersRootNode";
    }

    private get isRegistries(): boolean {
        return this.contextValue === "registriesRootNode";
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
            this._imageDebounceTimer = setInterval(
                async () => {
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

                },
                refreshInterval
            );
        }

    }

    public getTreeItem(): vscode.TreeItem {
        let label = this.label;
        let id = this.label;

        if (this.isImages) {
            let groupedLabel = "";

            switch (ext.groupImagesBy) {
                case ImageGrouping.None:
                    break;
                case ImageGrouping.ImageId:
                    groupedLabel = " (Grouped by Image Id)";
                    break;
                case ImageGrouping.Repository:
                    groupedLabel = " (Grouped by Repository)";
                    break;
                case ImageGrouping.RepositoryName:
                    groupedLabel = " (Grouped by Name)";
                    break;
                default:
                    assert(false, `Unexpected groupImagesBy ${ext.groupImagesBy}`)
            }

            label += groupedLabel;
        }

        return {
            label,
            id,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
        }

    }

    public async getChildren(element: RootNode): Promise<NodeBase[]> {
        // tslint:disable-next-line: no-this-assignment
        let me = this;
        // tslint:disable-next-line: no-function-expression
        return await callWithTelemetryAndErrorHandling('getChildren', async function (this: IActionContext): Promise<NodeBase[]> {
            this.properties.source = 'rootNode';

            switch (element.contextValue) {
                case 'imagesRootNode':
                    return me.getImageNodes();
                case 'containersRootNode':
                    return me.getContainers();
                case 'registriesRootNode':
                    return me.getRegistries();
                default:
                    throw new Error(`Unexpected contextValue ${element.contextValue}`);
            }
        });
    }

    // tslint:disable:max-func-body-length cyclomatic-complexity
    private async getImageNodes(): Promise<(ImageNode | ImageGroupNode | ErrorNode)[]> {
        // tslint:disable-next-line:no-this-assignment
        let me = this;

        return await callWithTelemetryAndErrorHandling('getChildren', async function (this: IActionContext): Promise<(ImageNode | ImageGroupNode | ErrorNode)[]> {
            this.properties.groupImagesBy = ImageGrouping[ext.groupImagesBy];
            this.properties.source = 'rootNode.images';

            // Determine templates to use
            let groupLabelTemplate: string;
            let leafLabelTemplate: string;
            switch (ext.groupImagesBy) {
                case ImageGrouping.None:
                    groupLabelTemplate = undefined; // (no group nodes)
                    leafLabelTemplate = '{fullTag} ({createdSince})';
                    break;
                case ImageGrouping.ImageId:
                    groupLabelTemplate = '{shortImageId}';
                    leafLabelTemplate = '{fullTag} ({createdSince})';
                    break;
                case ImageGrouping.Repository:
                    groupLabelTemplate = '{repository}';
                    leafLabelTemplate = '{tag} ({createdSince})';
                    break;
                case ImageGrouping.RepositoryName:
                    groupLabelTemplate = '{repositoryName}';
                    leafLabelTemplate = '{fullTag} ({createdSince})';
                    break;
                default:
                    assert(`Unexpected groupImagesBy ${ext.groupImagesBy}`);
            }

            // Get image descriptors
            let descriptors: Docker.ImageDesc[];
            try {
                descriptors = await docker.getImageDescriptors(imageFilters);
                if (!descriptors || descriptors.length === 0) {
                    return [];
                }
            } catch (error) {
                let newError = showDockerConnectionError(this, error);
                return [new ErrorNode(newError, ErrorNode.getImagesErrorContextValue)]
            }

            // Get leaf image nodes
            const imageNodes: ImageNode[] = [];
            for (let descriptor of descriptors) {
                if (!descriptor.RepoTags) {
                    let node = new ImageNode(`<none>:<none>`, descriptor, leafLabelTemplate);
                    imageNodes.push(node);
                } else {
                    for (let fullTag of descriptor.RepoTags) {
                        let node = new ImageNode(fullTag, descriptor, leafLabelTemplate);
                        imageNodes.push(node);
                    }
                }
            }

            // Get top-level nodes
            let topLevelNodes: (ImageNode | ImageGroupNode | ErrorNode)[];
            if (groupLabelTemplate) {
                const groupsMap = new Map<string, ImageGroupNode>();
                for (let imageNode of imageNodes) {
                    let groupLabel = getImageLabel(imageNode.fullTag, imageNode.imageDesc, groupLabelTemplate);
                    if (!groupsMap.has(groupLabel)) {
                        // Need a new top-level group node
                        let groupNode = new ImageGroupNode(groupLabel);
                        groupsMap.set(groupLabel, groupNode);
                    }

                    // Add image to the group node
                    groupsMap.get(groupLabel).children.push(imageNode);
                }

                topLevelNodes = Array.from(groupsMap.values());
            } else {
                // No grouping
                topLevelNodes = imageNodes;
            }

            me.autoRefreshImages();

            return topLevelNodes;
        });
    }

    private isContainerUnhealthy(container: Docker.ContainerDesc): boolean {
        return container.Status.includes('(unhealthy)');
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
            this._containerDebounceTimer = setInterval(
                async () => {
                    let needToRefresh: boolean = false;
                    let found: boolean = false;

                    const containers: Docker.ContainerDesc[] = await docker.getContainerDescriptors(containerFilters);

                    if (!this._containerCache) {
                        this._containerCache = containers;
                    }

                    if (this._containerCache.length !== containers.length) {
                        needToRefresh = true;
                    } else {
                        for (let cachedContainer of this._containerCache) {
                            let ctr: Docker.ContainerDesc = cachedContainer;
                            for (let cont of containers) {
                                // can't do a full object compare because "Status" keeps changing for running containers
                                if (ctr.Id === cont.Id &&
                                    ctr.Image === cont.Image &&
                                    ctr.State === cont.State &&
                                    this.isContainerUnhealthy(ctr) === this.isContainerUnhealthy(cont)) {
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

                },
                refreshInterval);
        }

    }

    private async getContainers(): Promise<(ContainerNode | ErrorNode)[]> {
        // tslint:disable-next-line:no-this-assignment
        let me = this;

        return await callWithTelemetryAndErrorHandling('getChildren', async function (this: IActionContext): Promise<(ContainerNode | ErrorNode)[]> {
            this.properties.source = 'rootNode.containers';

            const containerNodes: ContainerNode[] = [];
            let containers: Docker.ContainerDesc[];
            let contextValue: ContainerNodeContextValue;
            let iconPath: IconPath;

            try {
                containers = await docker.getContainerDescriptors(containerFilters);
                if (!containers || containers.length === 0) {
                    return [];
                }

                for (let container of containers) {
                    if (['exited', 'dead'].includes(container.State)) {
                        contextValue = "stoppedLocalContainerNode";
                        iconPath = {
                            light: path.join(imagesPath, 'light', 'StatusStop_16x.svg'),
                            dark: path.join(imagesPath, 'dark', 'StatusStop_16x.svg'),
                        };
                    } else if (me.isContainerUnhealthy(container)) {
                        contextValue = "runningLocalContainerNode";
                        iconPath = {
                            light: path.join(imagesPath, 'light', 'StatusWarning_16x.svg'),
                            dark: path.join(imagesPath, 'dark', 'StatusWarning_16x.svg'),
                        };
                    } else {
                        contextValue = "runningLocalContainerNode";
                        iconPath = {
                            light: path.join(imagesPath, 'light', 'StatusRun_16x.svg'),
                            dark: path.join(imagesPath, 'dark', 'StatusRun_16x.svg'),
                        };
                    }

                    let label = getContainerLabel(container, '{image} ({name}) ({status})');
                    let containerNode: ContainerNode = new ContainerNode(label, container, contextValue, iconPath);
                    containerNodes.push(containerNode);
                }
            } catch (error) {
                let newError = showDockerConnectionError(this, error);
                return [new ErrorNode(newError, ErrorNode.getContainersErrorContextValue)]
            }

            me.autoRefreshContainers();

            return containerNodes;
        });
    }

    private async getRegistries(): Promise<RegistryRootNode[]> {
        const registryRootNodes: RegistryRootNode[] = [];

        registryRootNodes.push(new RegistryRootNode('Docker Hub', "dockerHubRootNode", undefined, undefined));

        let azureAccount: AzureAccount = await AzureUtilityManager.getInstance().tryGetAzureAccount();
        if (azureAccount) {
            registryRootNodes.push(new RegistryRootNode('Azure', "azureRegistryRootNode", this.eventEmitter, azureAccount));
        }

        registryRootNodes.push(new RegistryRootNode('Private Registries', 'customRootNode', undefined, undefined));

        return registryRootNodes;
    }
}
