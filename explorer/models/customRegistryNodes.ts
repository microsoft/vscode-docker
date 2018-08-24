/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { formatTag, getCatalog, getTags, registryRequest } from './commonRegistryUtils';
import { CustomRegistry } from './customRegistries';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';

export class CustomRegistryNode extends NodeBase {
    public type: RegistryType = RegistryType.Custom;

    public static readonly contextValue: string = 'customRegistryNode';
    public contextValue: string = CustomRegistryNode.contextValue;

    public iconPath: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
    };

    constructor(
        public registryName: string,
        public registry: CustomRegistry
    ) {
        super(registryName);
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.registryName,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    // Returns undefined if it's valid, otherwise returns an error message
    public static async verifyIsValidRegistryUrl(registry: CustomRegistry): Promise<void> {
        // If the call succeeded, it's a V2 registry
        await registryRequest<{}>(registry.url, 'v2', registry.credentials);
    }

    public async getChildren(element: CustomRegistryNode): Promise<CustomRepositoryNode[]> {
        const repoNodes: CustomRepositoryNode[] = [];
        try {
            let repositories = await getCatalog(this.registry.url, this.registry.credentials);
            for (let repoName of repositories) {
                repoNodes.push(new CustomRepositoryNode(repoName, this.registry));
            }
        } catch (error) {
            vscode.window.showErrorMessage(parseError(error).message);
        }

        return repoNodes;
    }
}

export class CustomRepositoryNode extends NodeBase {
    public static readonly contextValue: string = 'customRepository';
    public contextValue: string = CustomRepositoryNode.contextValue;
    public iconPath: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
    };

    constructor(
        public readonly repositoryName: string, // e.g. 'hello-world' or 'registry'
        public readonly registry: CustomRegistry
    ) {
        super(repositoryName);
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: CustomRepositoryNode): Promise<CustomImageTagNode[]> {
        const imageNodes: CustomImageTagNode[] = [];
        let node: CustomImageTagNode;

        try {
            let tagInfos = await getTags(this.registry.url, this.repositoryName, this.registry.credentials);
            for (let tagInfo of tagInfos) {
                node = new CustomImageTagNode(this.registry, this.repositoryName, tagInfo.tag, tagInfo.created);
                imageNodes.push(node);
            }

            return imageNodes;
        } catch (error) {
            let message = `Docker: Unable to retrieve Repository Tags: ${parseError(error).message}`;
            console.error(message);
            vscode.window.showErrorMessage(message);
        }

        return imageNodes;
    }
}

export class CustomImageTagNode extends NodeBase {
    public static contextValue: string = 'customImageTagNode';
    public contextValue: string = CustomImageTagNode.contextValue;

    constructor(
        public readonly registry: CustomRegistry,
        public readonly repositoryName: string,
        public readonly tag: string,
        public readonly created: Date
    ) {
        super(`${repositoryName}:${tag}`);
    }

    public get serverUrl(): string {
        return this.registry.url;
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: formatTag(this.label, this.created),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}

export class CustomLoadingNode extends NodeBase {
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
