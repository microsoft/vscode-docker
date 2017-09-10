import * as vscode from 'vscode';
import * as fs from 'fs';
import * as path from 'path';
import { docker } from '../commands/utils/docker-endpoint';
import * as dockerHubAPI from 'docker-hub-api';
import { AzureAccount, AzureSession } from './azure-account.api';
import * as os from 'os';
import { dockerHubLogin } from './utils/dockerLogin';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import * as keytarType from 'keytar';
import request = require('request-promise');

import ContainerRegistryManagementClient = require('azure-arm-containerregistry');
import * as ContainerModels from '../node_modules/azure-arm-containerregistry/lib/models';
import * as ContainerOps from '../node_modules/azure-arm-containerregistry/lib/operations';
import { ServiceClientCredentials } from 'ms-rest';

const ContainerRegistryManagement = require('azure-arm-containerregistry');
const azureAccount: AzureAccount = vscode.extensions.getExtension<AzureAccount>('ms-vscode.azure-account')!.exports;


export class DockerExplorerProvider implements vscode.TreeDataProvider<NodeBase> {

    private _onDidChangeTreeData: vscode.EventEmitter<NodeBase> = new vscode.EventEmitter<NodeBase>();
    readonly onDidChangeTreeData: vscode.Event<NodeBase> = this._onDidChangeTreeData.event;

    private _imagesNode: RootNode;
    private _containersNode: RootNode;

    refresh(): void {
        this._onDidChangeTreeData.fire();
    }

    refreshImages(): void {
        if (this._imagesNode) {
            setTimeout(() => {
                this._onDidChangeTreeData.fire(this._imagesNode);
            },3000);
        }
    }

    refreshContainers(): void {
        if (this._containersNode) {
            // give time for containers to stop (e.g. compose down)
            setTimeout(() => {
                this._onDidChangeTreeData.fire(this._containersNode);
            },5000);
        }
    }

    getTreeItem(element: NodeBase): vscode.TreeItem {
        return element.getTreeItem();
    }

    async getChildren(element?: NodeBase): Promise<NodeBase[]> {
        if (!element) {
            return this.getRootNodes();
        }
        return element.getChildren(element);
    }

    private async getRootNodes(): Promise<RootNode[]> {
        const rootNodes: RootNode[] = [];
        let node: RootNode;

        node = new RootNode('Images', 'imagesRootNode', null);
        this._imagesNode = node;
        rootNodes.push(node);

        node = new RootNode('Containers', 'containersRootNode', null);
        this._containersNode = node;
        rootNodes.push(node);

        node = new RootNode('Registries', 'registriesRootNode', this._onDidChangeTreeData);
        rootNodes.push(node);

        return rootNodes;
    }
}

export class NodeBase {
    readonly label: string;

    protected constructor(label: string) {
        this.label = label;
    }

    getTreeItem(): vscode.TreeItem {

        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        };
    }

    async getChildren(element): Promise<NodeBase[]> {
        return [];
    }
}

export class RootNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label);
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
            return this.getImages();
        }
        if (element.contextValue === 'containersRootNode') {
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
                        light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
                        dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
                    };
                } else {
                    contextValue = "runningLocalContainerNode";
                    iconPath = {
                        light: path.join(__filename, '..', '..', '..', 'images', 'light', 'moby_small.png'),
                        dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'moby_small.png')
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
        registryRootNodes.push(new RegistryRootNode('Azure', "azureRootNode", this.eventEmitter));
        return registryRootNodes;
    }
}

export class ImageNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label)
    }

    public imageDesc: Docker.ImageDesc

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: "localImageNode",
            iconPath: {
                light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
                dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
            }
        }
    }

    // no children
}

export class ContainerNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label)
    }

    public containerDesc: Docker.ContainerDesc;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }
}

export class RegistryRootNode extends NodeBase {
    private _keytar: typeof keytarType;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>
    ) {
        super(label);
        try {
            this._keytar = require(`${vscode.env.appRoot}/node_modules/keytar`);
        } catch (e) {
            // unable to find keytar
        }

        if (this.eventEmitter && this.contextValue === 'azureRootNode') {
            azureAccount.onFiltersChanged((e) => {
                this.eventEmitter.fire(this);
            });
            azureAccount.onStatusChanged((e) => {
                this.eventEmitter.fire(this);
            });
            azureAccount.onSessionsChanged((e) => {
                this.eventEmitter.fire(this);
            });
        }
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
        }
    }

    async getChildren(element: RegistryRootNode): Promise<NodeBase[]> {
        if (element.contextValue === 'azureRootNode') {
            return this.getAzureRegistries();
        } else if (element.contextValue === 'dockerHubRootNode') {
            return this.getDockerHubOrgs();
        } else {
            return [];
        }
    }

    private async getDockerHubOrgs(): Promise<DockerHubOrgNode[]> {
        const orgNodes: DockerHubOrgNode[] = [];

        let id: { username: string, password: string, token: string } = { username: null, password: null, token: null };

        if (this._keytar) {
            id.token = await this._keytar.getPassword('vscode-docker', 'dockerhub.token');
        }

        if (!id.token) {
            id = await dockerHubLogin();
            if (id.token) {
                dockerHubAPI.setLoginToken(id.token);
                if (this._keytar) {
                    this._keytar.setPassword('vscode-docker', 'dockerhub.token', id.token);
                    this._keytar.setPassword('vscode-docker', 'dockerhub.password', id.password);
                    this._keytar.setPassword('vscode-docker', 'dockerhub.username', id.username);
                }
            } else {
                return orgNodes;
            }
        } else {
            dockerHubAPI.setLoginToken(id.token);
        }

        const user: any = await dockerHubAPI.loggedInUser();
        const myRepos: { namespace, name }[] = await dockerHubAPI.repositories(user.username);
        const namespaces = [...new Set(myRepos.map(item => item.namespace))];
        namespaces.forEach((namespace) => {
            let iconPath = {
                light: path.join(__filename, '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
            };
            let node = new DockerHubOrgNode(`${namespace}`, 'dockerHubNamespace', iconPath);
            node.userName = id.username;
            node.password = id.password;
            node.token = id.token;
            orgNodes.push(node);
        });

        return orgNodes;
    }

    private async getAzureRegistries(): Promise<AzureRegistryNode[]> {
        const loggedIntoAzure: boolean = await azureAccount.waitForLogin()
        const azureRegistryNodes: AzureRegistryNode[] = [];

        if (loggedIntoAzure) {

            const subs: SubscriptionModels.Subscription[] = this.getFilteredSubscriptions();

            for (let i = 0; i < subs.length; i++) {

                const client = new ContainerRegistryManagement(this.getCredentialByTenantId(subs[i].tenantId), subs[i].subscriptionId);
                const registries: ContainerModels.RegistryListResult = await client.registries.list();

                for (let j = 0; j < registries.length; j++) {

                    if (registries[j].adminUserEnabled && registries[j].sku.tier.includes('Managed')) {
                        const resourceGroup: string = registries[j].id.slice(registries[j].id.search('resourceGroups/') + 'resourceGroups/'.length, registries[j].id.search('/providers/'));
                        const creds: ContainerModels.RegistryListCredentialsResult = await client.registries.listCredentials(resourceGroup, registries[j].name);

                        let iconPath = {
                            light: path.join(__filename, '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                            dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
                        };
                        let node = new AzureRegistryNode(registries[j].loginServer, 'registry', iconPath);
                        node.type = RegistryType.Azure;
                        node.userName = creds.passwords[0].value;
                        node.password = creds.username;
                        node.subscription = subs[i];
                        azureRegistryNodes.push(node);
                    }
                }
            }
        }

        return azureRegistryNodes;
    }

    private getCredentialByTenantId(tenantId: string): ServiceClientCredentials {
        const session = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }

    private getFilteredSubscriptions(): SubscriptionModels.Subscription[] {
        return azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
            return {
                id: filter.subscription.id,
                session: filter.session,
                subscriptionId: filter.subscription.subscriptionId,
                tenantId: filter.session.tenantId,
                displayName: filter.subscription.displayName,
                state: filter.subscription.state,
                subscriptionPolicies: filter.subscription.subscriptionPolicies,
                authorizationSource: filter.subscription.authorizationSource
            };
        });
    }
}

export class DockerHubOrgNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label);
    }

    public repository: string;
    public userName: string;
    public password: string;
    public token: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: DockerHubOrgNode): Promise<DockerHubRepositoryNode[]> {
        const repoNodes: DockerHubRepositoryNode[] = [];
        let node: DockerHubRepositoryNode;

        const user: any = await dockerHubAPI.loggedInUser();
        const myRepos: { namespace, name }[] = await dockerHubAPI.repositories(user.username);

        for (let i = 0; i < myRepos.length; i++) {
            const myRepo = await dockerHubAPI.repository(myRepos[i].namespace, myRepos[i].name);
            let iconPath = {
                light: path.join(__filename, '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
                dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
            };
            node = new DockerHubRepositoryNode(myRepo.name, 'dockerHubRepository', iconPath);
            node.repository = myRepo;
            node.userName = element.userName;
            node.password = element.password;
            repoNodes.push(node);
        }
        return repoNodes;
    }
}

export class DockerHubRepositoryNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label);
    }

    public repository: any;
    public userName: string;
    public password: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: DockerHubRepositoryNode): Promise<DockerHubImageNode[]> {
        const imageNodes: DockerHubImageNode[] = [];
        let node: DockerHubImageNode;

        let myTags = await dockerHubAPI.tags(element.repository.namespace, element.repository.name);
        for (let i = 0; i < myTags.length; i++) {
            node = new DockerHubImageNode(`${element.repository.name}:${myTags[i].name}`, 'dockerHubImageTag');
            node.password = element.password;
            node.userName = element.userName;
            imageNodes.push(node);
        }

        return imageNodes;

    }
}

export class AzureRegistryNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label);
    }

    public type: RegistryType;
    public subscription: SubscriptionModels.Subscription;
    public userName: string;
    public password: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: AzureRegistryNode): Promise<AzureRepositoryNode[]> {
        const repoNodes: AzureRepositoryNode[] = [];
        let node: AzureRepositoryNode;

        const tenantId: string = element.subscription.tenantId;
        const session: AzureSession = azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());
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

            await request.get('https://' + element.label + '/v2/_catalog', {
                auth: {
                    bearer: accessTokenARC
                }
            }, (err, httpResponse, body) => {
                if (body.length > 0) {
                    const repositories = JSON.parse(body).repositories;
                    for (let i = 0; i < repositories.length; i++) {
                        node = new AzureRepositoryNode(repositories[i], "azureRepository");
                        node.repository = element.label;
                        node.subscription = element.subscription;
                        node.accessTokenARC = accessTokenARC;
                        node.refreshTokenARC = refreshTokenARC;
                        node.userName = element.userName;
                        node.password = element.password;
                        repoNodes.push(node);
                    }
                }
            });
        }

        return repoNodes;
    }
}

export class AzureRepositoryNode extends NodeBase {

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath = {
            light: path.join(__filename, '..', '..', '..', 'images', 'light', 'Repository_16x.svg'),
            dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'Repository_16x.svg')
        }
    ) {
        super(label);
    }

    public repository: string;
    public subscription: any;
    public accessTokenARC: string;
    public refreshTokenARC: string;
    public userName: string;
    public password: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: AzureRepositoryNode): Promise<AzureImageNode[]> {
        const imageNodes: AzureImageNode[] = [];
        let node: AzureImageNode;

        const { accessToken, refreshToken } = await acquireToken(element.subscription.session);

        if (accessToken && refreshToken) {
            const tenantId = element.subscription.tenantId;
            let refreshTokenARC;
            let accessTokenARC;

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
                    const tags = JSON.parse(body).tags;
                    for (let i = 0; i < tags.length; i++) {
                        node = new AzureImageNode(element.label + ':' + tags[i], 'azureRepositoryTag');
                        // node.repository = element.repository;
                        // node.subscription = element.subscription;
                        // node.accessTokenARC = accessTokenARC;
                        // node.refreshTokenARC = element.refreshTokenARC;
                        // node.registryUserName = element.registryUserName;
                        // node.registryPassword = element.registryPassword;
                        imageNodes.push(node);
                    }
                }
            });
        }
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

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}

export class DockerHubImageNode extends NodeBase {
    constructor(
        public readonly label: string,
        public readonly contextValue: string
    ) {
        super(label);
    }

    public userName: string;
    public password: string;

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue
        }
    }
}

export class DockerNode extends vscode.TreeItem {

    constructor(public readonly label: string,
        public readonly collapsibleState: vscode.TreeItemCollapsibleState,
        public readonly contextValue: string,
        public readonly command?: vscode.Command,
        public iconPath: any = {
            light: path.join(__filename, '..', '..', '..', 'images', 'light', 'mono_moby_small.png'),
            dark: path.join(__filename, '..', '..', '..', 'images', 'dark', 'mono_moby_small.png')
        }) {

        super(label, collapsibleState);
    }

    public containerDesc: Docker.ContainerDesc;
    public imageDesc: Docker.ImageDesc;
    public repository: any = {};
    public subscription: SubscriptionItem;
    public refreshTokenARC: string;
    public accessTokenARC: string;
    public registryUserName: string;
    public registryPassword: string;
}

enum RegistryType {
    DockerHub,
    Azure,
    Unknown
}


interface Registry {
    url: string;
    registryType: RegistryType;
    userName: string;
    password: string;
    token: string;
    friendlyName: string;
}

interface SubscriptionItem {
    label: string;
    description: string;
    session: AzureSession;
    subscription: SubscriptionModels.Subscription;
}

interface PartialList<T> extends Array<T> {
    nextLink?: string;
}


async function acquireToken(session: AzureSession) {
    return new Promise<{ accessToken: string; refreshToken: string; }>((resolve, reject) => {
        const credentials: any = session.credentials;
        const environment: any = session.environment;
        credentials.context.acquireToken(environment.activeDirectoryResourceId, credentials.username, credentials.clientId, function (err: any, result: any) {
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
