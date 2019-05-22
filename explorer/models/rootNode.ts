/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';
import { docker, ListContainerDescOptions as GetContainerDescOptions } from '../../commands/utils/docker-endpoint';
import { ext, ImageGrouping } from '../../src/extensionVariables';
import { AzureUtilityManager } from '../../src/utils/azureUtilityManager';
import { treeUtils } from '../../src/utils/treeUtils';
import { AzureAccount } from '../../typings/azure-account.api';
import { showDockerConnectionError } from '../utils/dockerConnectionError';
import { ContainerNode, ContainerNodeContextValue } from './containerNode';
import { ErrorNode } from './errorNode';
import { getContainerLabel } from './getContainerLabel';
import { getImageLabel } from './getImageLabel';
import { ImageGroupNode } from './imageGroupNode';
import { ImageNode } from './imageNode';
import { NodeBase } from './nodeBase';
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

type ContainerState = // https://docs.docker.com/engine/api/v1.21/
    'created' |       // A container that has been created(e.g.with docker create) but not started
    'restarting' |    // A container that is in the process of being restarted
    'running' |       // A currently running container
    'paused' |        // A container whose processes have been paused
    'exited' |        // A container that ran and completed("stopped" in other contexts, although a created container is technically also "stopped")
    'dead';           // A container that the daemon tried and failed to stop(usually due to a busy device or resource used by the c = container.State;

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
        return await callWithTelemetryAndErrorHandling('getChildren', async (context: IActionContext) => {
            context.telemetry.properties.source = 'rootNode';

            switch (element.contextValue) {
                case 'imagesRootNode':
                    return this.getImageNodes();
                case 'containersRootNode':
                    return this.getContainers();
                case 'registriesRootNode':
                    return this.getRegistries();
                default:
                    throw new Error(`Unexpected contextValue ${element.contextValue}`);
            }
        });
    }

    // tslint:disable:max-func-body-length cyclomatic-complexity
    private async getImageNodes(): Promise<(ImageNode | ImageGroupNode | ErrorNode)[]> {
        return await callWithTelemetryAndErrorHandling('getChildren', async (context: IActionContext) => {
            context.telemetry.properties.groupImagesBy = ImageGrouping[ext.groupImagesBy];
            context.telemetry.properties.source = 'rootNode.images';

            // Determine templates to use
            let groupLabelTemplate: string;
            let leafLabelTemplate: string;
            let groupIconName: string;
            switch (ext.groupImagesBy) {
                case ImageGrouping.None:
                    groupLabelTemplate = undefined; // (no group nodes)
                    leafLabelTemplate = '{fullTag} ({createdSince})';
                    groupIconName = '';
                    break;
                case ImageGrouping.ImageId:
                    groupLabelTemplate = '{shortImageId}';
                    leafLabelTemplate = '{fullTag} ({createdSince})';
                    groupIconName = 'ApplicationGroup_16x';
                    break;
                case ImageGrouping.Repository:
                    groupLabelTemplate = '{repository}';
                    leafLabelTemplate = '{tag} ({createdSince})';
                    groupIconName = 'Repository_16x';
                    break;
                case ImageGrouping.RepositoryName:
                    groupLabelTemplate = '{repositoryName}';
                    leafLabelTemplate = '{fullTag} ({createdSince})';
                    groupIconName = 'ApplicationGroup_16x';
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
                let newError = showDockerConnectionError(context, error);
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
                        let groupNode = new ImageGroupNode(groupLabel, groupIconName);
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

            this.autoRefreshImages();

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
        return await callWithTelemetryAndErrorHandling('getChildren', async (context: IActionContext) => {
            context.telemetry.properties.source = 'rootNode.containers';

            const containerNodes: ContainerNode[] = [];
            let containers: Docker.ContainerDesc[];
            let contextValue: ContainerNodeContextValue;
            let iconPath: treeUtils.IThemedIconPath;

            try {
                containers = await docker.getContainerDescriptors(containerFilters);
                if (!containers || containers.length === 0) {
                    return [];
                }

                for (let container of containers) {
                    let state: ContainerState = <ContainerState>container.State;

                    // Determine icon
                    switch (state) {
                        case "dead":
                        case "exited":
                        case "created":
                            iconPath = treeUtils.getThemedIconPath('StatusStop_16x');
                            break;
                        case "paused":
                            iconPath = treeUtils.getThemedIconPath('StatusPause_16x');
                            break;
                        case "restarting":
                            iconPath = treeUtils.getThemedIconPath('Restart_16x');
                            break;
                        case "running":
                        default:
                            iconPath = treeUtils.getThemedIconPath('StatusRun_16x');
                    }

                    // Determine contextValue
                    if (['exited', 'dead'].includes(state)) {
                        contextValue = "stoppedLocalContainerNode";
                    } else if (this.isContainerUnhealthy(container)) {
                        contextValue = "runningLocalContainerNode";
                        // Override icon from above
                        iconPath = treeUtils.getThemedIconPath('StatusWarning_16x');
                    } else {
                        contextValue = "runningLocalContainerNode";
                    }

                    let label = getContainerLabel(container, '{image} ({name}) ({status})');
                    let containerNode: ContainerNode = new ContainerNode(label, container, contextValue, iconPath);
                    containerNodes.push(containerNode);
                }
            } catch (error) {
                let newError = showDockerConnectionError(context, error);
                return [new ErrorNode(newError, ErrorNode.getContainersErrorContextValue)]
            }

            this.autoRefreshContainers();

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
