import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import * as moment from 'moment';
import * as path from 'path';
import { RequestClient } from 'reqclient';
import * as request from 'request-promise';
import * as vscode from 'vscode';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import { MAX_CONCURRENT_REQUESTS } from '../../utils/constants'
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

    public password: string;
    public registry: ContainerModels.Registry;
    public subscription: SubscriptionModels.Subscription;
    public type: RegistryType;
    public userName: string;

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    private async isV2Registry(url: string): Promise<boolean> {
        try {
            // If this succeeds, it's a V2 registry
            request.get(`${url}/v2`);
            return true;
        } catch (err) {
            return false;
        }
    }

    // tslint:disable-next-line:max-func-body-length
    public async getChildren(element: AzureRegistryNode): Promise<AzureRepositoryNode[]> {
        const repoNodes: AzureRepositoryNode[] = [];
        let node: AzureRepositoryNode;

        const tenantId: string = element.subscription.tenantId;
        if (!this._azureAccount) {
            return [];
        }

        const session: AzureSession = this._azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        const { accessToken, refreshToken } = await acquireToken(session);

        // tslint:disable-next-line:no-http-string
        let url = 'http://' + element.label;

        if (!await this.isV2Registry(url)) {
            throw new Error('Does not appear to be a valid V2 registry');
        }

        // tslint:disable-next-line:no-http-string
        //url = 'http://localhost:5000';
        //        let a = await client.get(url);
        let a2 = await request.get(url);

        //      let b = await client.get(url + '/v2');
        let b2 = await request.get(url + '/v2');

        //    let c = await client.get(url + '/v2/_catalog');
        let c2 = await request.get(url + '/v2/_catalog');

        //let d2 = await request.get('https://' + element.label);
        let client = new RequestClient({
            baseUrl: '',
            debugRequest: true, debugResponse: true,
            oauth2: {
                user: "stephwereg", pass: "",
                baseUrl: 'https://' + element.label + "/oauth2",
                fullResponse: true
            },
            //sendImmediately: false,
            fullResponse: true
        });
        client.fullResponse = true;

        //let e2 = await request.get('https://' + element.label + "/v2");
        try {
            let e = await client.get('https://' + element.label + '/v2/_catalog', {
                fullResponse: true
            });
            let f = e;
        } catch (error) {
            console.error(error);
        }

        let f2 = await request.get('https://' + element.label + "/v2/_catalog");

        try {
            let response = await request(url, {

            });
        } catch (error) {
            let d = error;
        }

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

            // await request.post('https://' + element.label + '/oauth2/token', {
            //     form: {
            //         grant_type: 'refresh_token',
            //         service: element.label,
            //         scope: 'registry:catalog:*',
            //         refresh_token: refreshTokenARC
            //     }
            // }, (err, httpResponse, body) => {
            //     if (body.length > 0) {
            //         accessTokenARC = JSON.parse(body).access_token;
            //     } else {
            //         return [];
            //     }
            // });
            await request.get('https://' + element.label + '/v2/_catalog', {
                // auth: {
                //     bearer: accessTokenARC
                // }
            }, (err, httpResponse, body) => {
                if (body && body.length > 0) {
                    const repositories = JSON.parse(body).repositories;
                    // tslint:disable-next-line:prefer-for-of // Grandfathered in
                    for (let i = 0; i < repositories.length; i++) {
                        node = new AzureRepositoryNode(repositories[i], "azureRepositoryNode");
                        node.accessTokenARC = accessTokenARC;
                        node.azureAccount = element.azureAccount;
                        node.password = element.password;
                        node.refreshTokenARC = refreshTokenARC;
                        node.registry = element.registry;
                        node.repository = element.label;
                        node.subscription = element.subscription;
                        node.userName = element.userName;
                        repoNodes.push(node);
                    }
                }
            });
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

    public accessTokenARC: string;
    public azureAccount: AzureAccount
    public password: string;
    public refreshTokenARC: string;
    public registry: ContainerModels.Registry;
    public repository: string;
    public subscription: SubscriptionModels.Subscription;
    public userName: string;

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
        let created: string = '';
        let refreshTokenARC;
        let accessTokenARC;
        let tags;

        const tenantId: string = element.subscription.tenantId;
        const session: AzureSession = element.azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        const { accessToken, refreshToken } = await acquireToken(session);

        if (accessToken && refreshToken) {
            await request.post('https://' + element.repository + '/oauth2/exchange', {
                form: {
                    grant_type: 'access_token_refresh_token',
                    service: element.repository,
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

            await request.post('https://' + element.repository + '/oauth2/token', {
                form: {
                    grant_type: 'refresh_token',
                    service: element.repository,
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

            await request.get('https://' + element.repository + '/v2/' + element.label + '/tags/list', {
                auth: {
                    bearer: accessTokenARC
                }
            }, (err, httpResponse, body) => {
                if (err) { return []; }
                if (body.length > 0) {
                    tags = JSON.parse(body).tags;
                }
            });

            const pool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let i = 0; i < tags.length; i++) {
                pool.addTask(async () => {
                    let data = await request.get('https://' + element.repository + '/v2/' + element.label + `/manifests/${tags[i]}`, {
                        auth: {
                            bearer: accessTokenARC
                        }
                    });

                    //Acquires each image's manifest to acquire build time.
                    let manifest = JSON.parse(data);
                    node = new AzureImageNode(`${element.label}:${tags[i]}`, 'azureImageNode');
                    node.azureAccount = element.azureAccount;
                    node.password = element.password;
                    node.registry = element.registry;
                    node.serverUrl = element.repository;
                    node.subscription = element.subscription;
                    node.userName = element.userName;
                    node.created = moment(new Date(JSON.parse(manifest.history[0].v1Compatibility).created)).fromNow();
                    imageNodes.push(node);
                });
            }
            await pool.runAll();

        }
        function sortFunction(a: AzureImageNode, b: AzureImageNode): number {
            return a.created.localeCompare(b.created);
        }
        imageNodes.sort(sortFunction);
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
    public password: string;
    public registry: ContainerModels.Registry;
    public serverUrl: string;
    public subscription: SubscriptionModels.Subscription;
    public userName: string;

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
