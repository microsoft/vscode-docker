/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as moment from 'moment';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_REQUESTS } from '../../constants'
import { AzureAccount } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import { acquireACRAccessTokenFromRegistry, getImagesByRepository, getRawImageManifest, getRepositoriesByRegistry } from '../../utils/Azure/acrTools';
import { AzureImage } from '../../utils/Azure/models/image';
import { Repository } from '../../utils/Azure/models/repository';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';

export class AzureRegistryNode extends NodeBase {
    private _azureAccount: AzureAccount;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {},
        public readonly azureAccount?: AzureAccount
    ) {
        super(label);
        this._azureAccount = azureAccount;
    }

    public registry: ContainerModels.Registry;
    public subscription: SubscriptionModels.Subscription;
    public type: RegistryType;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: AzureRegistryNode): Promise<AzureRepositoryNode[]> {
        const repoNodes: AzureRepositoryNode[] = [];

        if (!this._azureAccount) {
            return [];
        }

        const repositories: Repository[] = await getRepositoriesByRegistry(element.registry);
        for (let repo of repositories) {
            let node = new AzureRepositoryNode(repo.name, "azureRepositoryNode");
            node.azureAccount = element.azureAccount;
            node.registry = element.registry;
            node.subscription = element.subscription;
            repoNodes.push(node);
        }

        //Note these are ordered by default in alphabetical order
        return repoNodes;
    }
}

export class AzureRepositoryNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: { light: string | vscode.Uri; dark: string | vscode.Uri } = {
            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
        }
    ) {
        super(label);
    }

    public azureAccount: AzureAccount
    public registry: ContainerModels.Registry;
    public subscription: SubscriptionModels.Subscription;
    public parent: NodeBase;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: AzureRepositoryNode): Promise<AzureImageNode[]> {
        const imageNodes: AzureImageNode[] = [];
        let node: AzureImageNode;
        let repo = new Repository(element.registry, element.label);
        let images: AzureImage[] = await getImagesByRepository(repo);
        let { acrAccessToken } = await acquireACRAccessTokenFromRegistry(element.registry, `repository:${element.label}:pull`)
        const pool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
        for (let image of images) {
            pool.addTask(async () => {
                let data: string;
                try {
                    data = await getRawImageManifest(image, acrAccessToken);
                } catch (error) {
                    vscode.window.showErrorMessage(parseError(error).message);
                }

                if (data) {
                    //Acquires each image's manifest to acquire build time.
                    let manifest = JSON.parse(data);
                    node = new AzureImageNode(`${element.label}:${image.tag}`, 'azureImageNode');
                    node.azureAccount = element.azureAccount;
                    node.registry = element.registry;
                    node.serverUrl = element.registry.loginServer;
                    node.subscription = element.subscription;
                    node.parent = element;
                    node.created = moment(new Date(JSON.parse(manifest.history[0].v1Compatibility).created)).fromNow();
                    imageNodes.push(node);
                }
            });
        }
        await pool.runAll();
        function compareFn(a: AzureImageNode, b: AzureImageNode): number {
            return a.created.localeCompare(b.created);
        }
        imageNodes.sort(compareFn);
        return imageNodes;
    }
}

export class AzureImageNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string
    ) {
        super(label);
    }

    public azureAccount: AzureAccount
    public created: string;
    public registry: ContainerModels.Registry;
    public serverUrl: string;
    public subscription: SubscriptionModels.Subscription;
    public parent: NodeBase;

    public getTreeItem(): vscode.TreeItem {
        let displayName: string = this.label;

        displayName = `${displayName} (${this.created})`;

        return {
            label: `${displayName}`,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}

export class AzureNotSignedInNode extends NodeBase {
    constructor() {
        super('Click here to sign in to Azure...');
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            command: {
                title: this.label,
                command: 'azure-account.login'
            },
            collapsibleState: vscode.TreeItemCollapsibleState.None
        }
    }
}

export class AzureLoadingNode extends NodeBase {
    constructor() {
        super('Loading...');
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        }
    }
}
