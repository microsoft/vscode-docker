import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import * as moment from 'moment';
import * as path from 'path';
import * as request from 'request-promise';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { MAX_CONCURRENT_REQUESTS } from '../../constants'
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';
import { TaskRootNode } from './taskNode';

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

    public async getChildren(element: AzureRegistryNode): Promise<NodeBase[]> {
        const registryChildNodes: NodeBase[] = [];

        let iconPath = {
            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'buildTasks_light.svg'),
            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'buildTasks_dark.svg')
        };

        //Pushing single TaskRootNode under the current registry. All the following nodes added to registryNodes are type AzureRepositoryNode
        let taskNode = new TaskRootNode("Build Tasks", "taskRootNode", element.subscription, element.azureAccount, element.registry, iconPath);
        registryChildNodes.push(taskNode);

        const tenantId: string = element.subscription.tenantId;
        if (!this._azureAccount) {
            return [];
        }

        const session: AzureSession = this._azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
        const { accessToken, refreshToken } = await acquireToken(session);

        let node: AzureRepositoryNode;

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
            await request.get('https://' + element.label + '/v2/_catalog', {
                auth: {
                    bearer: accessTokenARC
                }
            }, (err, httpResponse, body) => {
                if (body.length > 0) {
                    const repositories = JSON.parse(body).repositories;
                    for (let repo of repositories) {
                        node = new AzureRepositoryNode(repo, "azureRepositoryNode");
                        node.accessTokenARC = accessTokenARC;
                        node.azureAccount = element.azureAccount;
                        node.refreshTokenARC = refreshTokenARC;
                        node.registry = element.registry;
                        node.repository = element.label;
                        node.subscription = element.subscription;
                        node.parent = element;
                        registryChildNodes.push(node);
                    }
                }
            });
            //Note these are ordered by default in alphabetical order
        }
        return registryChildNodes;
    }
}
export class AzureRepositoryNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: AzureRegistryNode['iconPath'] = {
            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
        }
    ) {
        super(label);
    }

    public accessTokenARC: string;
    public azureAccount: AzureAccount
    public refreshTokenARC: string;
    public registry: ContainerModels.Registry;
    public repository: string;
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
            for (let tag of tags) {
                pool.addTask(async () => {
                    let data: string;
                    try {
                        data = await request.get('https://' + element.repository + '/v2/' + element.label + `/manifests/${tags}`, {
                            auth: {
                                bearer: accessTokenARC
                            }
                        });
                    } catch (error) {
                        vscode.window.showErrorMessage(parseError(error).message);
                    }

                    if (data) {
                        //Acquires each image's manifest to acquire build time.
                        let manifest = JSON.parse(data);
                        node = new AzureImageNode(`${element.label}:${tag}`, 'azureImageNode');
                        node.azureAccount = element.azureAccount;
                        node.registry = element.registry;
                        node.serverUrl = element.repository;
                        node.subscription = element.subscription;
                        node.parent = element;
                        node.created = moment(new Date(JSON.parse(manifest.history[0].v1Compatibility).created)).fromNow();
                        imageNodes.push(node);
                    }
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

async function acquireToken(session: AzureSession): Promise<{ accessToken: string; refreshToken: string; }> {
    return new Promise<{ accessToken: string; refreshToken: string; }>((resolve, reject) => {
        const credentials: any = session.credentials;
        const environment: any = session.environment;
        // tslint:disable-next-line:no-function-expression // Grandfathered in
        credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, function (err: any, result: any): any {
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
