/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { MAX_CONCURRENT_REQUESTS } from '../../constants';
import { AsyncPool } from '../../utils/asyncpool';
import * as dockerHub from '../utils/dockerHubUtils';
import { formatTag } from './commonRegistryUtils';
import { NodeBase } from './nodeBase';

/**
 * This is a child node of the "Docker Hub" node - i.e., it represents a namespace, e.g. a docker ID or an organization name
 */
export class DockerHubOrgNode extends NodeBase {

    constructor(
        public readonly namespace: string
    ) {
        super(namespace);
    }

    public static readonly contextValue: string = 'dockerHubOrgNode';
    public readonly contextValue: string = DockerHubOrgNode.contextValue;
    public readonly label: string = this.namespace;

    public iconPath: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
    };

    public userName: string;
    public password: string;
    public token: string;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: DockerHubOrgNode): Promise<DockerHubRepositoryNode[]> {
        const repoNodes: DockerHubRepositoryNode[] = [];
        let node: DockerHubRepositoryNode;

        const user: dockerHub.User = await dockerHub.getUser();
        const myRepos: dockerHub.Repository[] = await dockerHub.getRepositories(user.username);
        const repoPool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
        // tslint:disable-next-line:prefer-for-of // Grandfathered in
        for (let i = 0; i < myRepos.length; i++) {
            repoPool.addTask(async () => {
                let myRepo: dockerHub.RepositoryInfo = await dockerHub.getRepositoryInfo(myRepos[i]);
                node = new DockerHubRepositoryNode(myRepo.name);
                node.repository = myRepo;
                node.userName = element.userName;
                node.password = element.password;
                repoNodes.push(node);
            });
        }
        await repoPool.runAll();
        repoNodes.sort((a, b) => a.label.localeCompare(b.label));
        return repoNodes;
    }
}

export class DockerHubRepositoryNode extends NodeBase {

    constructor(
        public readonly label: string
    ) {
        super(label);
    }

    public static readonly contextValue: string = 'dockerHubRepositoryNode';
    public readonly contextValue: string = DockerHubRepositoryNode.contextValue;

    public iconPath: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
    };
    public repository: any;
    public userName: string;
    public password: string;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: DockerHubRepositoryNode): Promise<DockerHubImageTagNode[]> {
        const imageNodes: DockerHubImageTagNode[] = [];
        let node: DockerHubImageTagNode;

        const myTags: dockerHub.Tag[] = await dockerHub.getRepositoryTags({ namespace: element.repository.namespace, name: element.repository.name });
        for (let tag of myTags) {
            node = new DockerHubImageTagNode(element.repository.name, tag.name);
            node.password = element.password;
            node.userName = element.userName;
            node.repository = element.repository;
            node.created = new Date(tag.last_updated);
            imageNodes.push(node);
        }

        return imageNodes;
    }
}

export class DockerHubImageTagNode extends NodeBase {
    constructor(
        public readonly repositoryName: string,
        public readonly tag: string
    ) {
        super(`${repositoryName}:${tag}`);
    }

    public static readonly contextValue: string = 'dockerHubImageTagNode';
    public readonly contextValue: string = DockerHubImageTagNode.contextValue;

    // this needs to be empty string for Docker Hub
    public serverUrl: string = '';
    public userName: string;
    public password: string;
    public repository: any;
    public created: Date;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: formatTag(this.label, this.created),
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}
