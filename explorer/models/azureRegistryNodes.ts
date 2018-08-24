/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as moment from 'moment';
import * as path from 'path';
import * as request from 'request-promise';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_REQUESTS } from '../../constants'
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import { getRepositories } from '../utils/dockerHubUtils';
import { formatTag, getCatalog, getTags } from './commonRegistryUtils';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';

export class AzureRegistryNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly azureAccount: AzureAccount | undefined,
        public readonly registry: ContainerModels.Registry,
        public readonly subscription: SubscriptionModels.Subscription
    ) {
        super(label);
    }

    public readonly contextValue: string = 'azureRegistryNode';
    public readonly iconPath: string | vscode.Uri | { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
    };

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
        let node: AzureRepositoryNode;

        const tenantId: string = element.subscription.tenantId;
        if (!this.azureAccount) {
            return [];
        }

        const session: AzureSession = this.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        const { accessToken, refreshToken } = await acquireToken(session);

        if (accessToken && refreshToken) {
            let refreshTokenARC;
            let accessTokenARC;

            await request.post('https://' + element.label + '/oauth2/exchange', {
                form: {
                    grant_type: 'access_token_refresh_token',
                    service: element.label,
                    tenant: tenantId,
                    refresh_token: refreshToken,
                    access_token: accessToken
                }
            }, (err, httpResponse, body) => {
                if (body.length > 0) {
                    refreshTokenARC = JSON.parse(body).refresh_token;
                } else {
                    return [];
                }
            });

            await request.post('https://' + element.label + '/oauth2/token', {
                form: {
                    grant_type: 'refresh_token',
                    service: element.label,
                    scope: 'registry:catalog:*',
                    refresh_token: refreshTokenARC
                }
            }, (err, httpResponse, body) => {
                if (body.length > 0) {
                    accessTokenARC = JSON.parse(body).access_token;
                } else {
                    return [];
                }
            });

            let repositories = await getCatalog('https://' + element.label, { bearer: accessTokenARC });
            for (let repository of repositories) {
                node = new AzureRepositoryNode(repository,
                    this.azureAccount,
                    element.subscription,
                    accessTokenARC,
                    refreshTokenARC,
                    element.registry,
                    element.label);
                repoNodes.push(node);
            }
        }

        //Note these are ordered by default in alphabetical order
        return repoNodes;
    }
}

export class AzureRepositoryNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly azureAccount: AzureAccount,
        public readonly subscription: SubscriptionModels.Subscription,
        public readonly accessTokenARC: string,
        public readonly refreshTokenARC: string,
        public readonly registry: ContainerModels.Registry,
        public readonly repositoryName: string
    ) {
        super(label);
    }

    public static readonly contextValue: string = 'azureRepositoryNode';
    public readonly contextValue: string = AzureRepositoryNode.contextValue;
    public readonly iconPath: { light: string | vscode.Uri; dark: string | vscode.Uri } = {
        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
    };

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    public async getChildren(element: AzureRepositoryNode): Promise<AzureImageTagNode[]> {
        const imageNodes: AzureImageTagNode[] = [];
        let node: AzureImageTagNode;
        let refreshTokenARC;
        let accessTokenARC;

        const tenantId: string = element.subscription.tenantId;
        const session: AzureSession = element.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        const { accessToken, refreshToken } = await acquireToken(session);

        await request.post('https://' + element.repositoryName + '/oauth2/exchange', {
            form: {
                grant_type: 'access_token_refresh_token',
                service: element.repositoryName,
                tenant: tenantId,
                refresh_token: refreshToken,
                access_token: accessToken
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                refreshTokenARC = JSON.parse(body).refresh_token;
            } else {
                return [];
            }
        });

        await request.post('https://' + element.repositoryName + '/oauth2/token', {
            form: {
                grant_type: 'refresh_token',
                service: element.repositoryName,
                scope: 'repository:' + element.label + ':pull',
                refresh_token: refreshTokenARC
            }
        }, (err, httpResponse, body) => {
            if (body.length > 0) {
                accessTokenARC = JSON.parse(body).access_token;
            } else {
                return [];
            }
        });

        let tagInfos = await getTags('https://' + element.repositoryName, element.label, { bearer: accessTokenARC });
        for (let tagInfo of tagInfos) {
            node = new AzureImageTagNode(
                element.azureAccount,
                element.subscription,
                element.registry,
                element.registry.loginServer,
                element.label,
                tagInfo.tag,
                tagInfo.created);
            imageNodes.push(node);
        }

        return imageNodes;
    }
}

export class AzureImageTagNode extends NodeBase {
    constructor(
        public readonly azureAccount: AzureAccount,
        public readonly subscription: SubscriptionModels.Subscription,
        public readonly registry: ContainerModels.Registry,
        public readonly serverUrl: string,
        public readonly repositoryName: string,
        public readonly tag: string,
        public readonly created: Date,
    ) {
        super(`${repositoryName}:${tag}`);
    }

    public static readonly contextValue: string = 'azureImageTagNode';
    public readonly contextValue: string = AzureImageTagNode.contextValue;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: formatTag(this.label, this.created),
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

async function acquireToken(session: AzureSession): Promise<{ accessToken: string; refreshToken: string; }> {
    return new Promise<{ accessToken: string; refreshToken: string; }>((resolve, reject) => {
        const credentials: any = session.credentials;
        const environment: any = session.environment;
        // tslint:disable-next-line:no-function-expression // Grandfathered in
        credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, function (err: any, result: { accessToken: string; refreshToken: string; }): void {
            if (err) {
                reject(err);
            } else {
                resolve({
                    accessToken: result.accessToken,
                    refreshToken: result.refreshToken
                });
            }
        });
    });
}
