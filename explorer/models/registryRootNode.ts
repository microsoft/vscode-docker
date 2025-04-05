import ContainerRegistryManagementClient = require('azure-arm-containerregistry');
import { ResourceManagementClient, SubscriptionClient, SubscriptionModels } from 'azure-arm-resource';
import { TIMEOUT } from 'dns';
import * as keytarType from 'keytar';
import { ServiceClientCredentials } from 'ms-rest';
import * as path from 'path';
import * as vscode from 'vscode';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import * as ContainerOps from '../../node_modules/azure-arm-containerregistry/lib/operations';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import { MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../../utils/constants'
import * as dockerHub from '../utils/dockerHubUtils'
import { getCoreNodeModule } from '../utils/utils';
import { AzureLoadingNode, AzureNotSignedInNode, AzureRegistryNode } from './azureRegistryNodes';
import { CustomRegistryNode } from './customRegistryNodes';
import { DockerHubOrgNode } from './dockerHubNodes';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';

// tslint:disable-next-line:no-var-requires
const ContainerRegistryManagement = require('azure-arm-containerregistry');

export class RegistryRootNode extends NodeBase {
    private _keytar: typeof keytarType;
    private _azureAccount: AzureAccount;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>,
        public readonly azureAccount?: AzureAccount
    ) {
        super(label);
        this._keytar = getCoreNodeModule('keytar');

        this._azureAccount = azureAccount;

        if (this._azureAccount && this.eventEmitter && this.contextValue === 'azureRegistryRootNode') {

            this._azureAccount.onFiltersChanged((e) => {
                this.eventEmitter.fire(this);
            });
            this._azureAccount.onStatusChanged((e) => {
                this.eventEmitter.fire(this);
            });
            this._azureAccount.onSessionsChanged((e) => {
                this.eventEmitter.fire(this);
            });
        }
    }

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
        }
    }

    public async getChildren(element: RegistryRootNode): Promise<NodeBase[]> {
        if (element.contextValue === 'azureRegistryRootNode') {
            return this.getAzureRegistries();
        } else if (element.contextValue === 'dockerHubRootNode') {
            return this.getDockerHubOrgs();
        } else {
            //asdf
            // tslint:disable-next-line:no-http-string
            return this.getCustomRegistries();
        }
    }

    private async getDockerHubOrgs(): Promise<DockerHubOrgNode[]> {
        const orgNodes: DockerHubOrgNode[] = [];

        let id: { username: string, password: string, token: string } = { username: null, password: null, token: null };

        if (this._keytar) {
            id.token = await this._keytar.getPassword('vscode-docker', 'dockerhub.token');
            id.username = await this._keytar.getPassword('vscode-docker', 'dockerhub.username');
            id.password = await this._keytar.getPassword('vscode-docker', 'dockerhub.password');
        }

        if (!id.token) {
            id = await dockerHub.dockerHubLogin();

            if (id && id.token) {
                if (this._keytar) {
                    await this._keytar.setPassword('vscode-docker', 'dockerhub.token', id.token);
                    await this._keytar.setPassword('vscode-docker', 'dockerhub.password', id.password);
                    await this._keytar.setPassword('vscode-docker', 'dockerhub.username', id.username);
                }
            } else {
                return orgNodes;
            }
        } else {
            dockerHub.setDockerHubToken(id.token);
        }

        const user: dockerHub.User = await dockerHub.getUser();
        const myRepos: dockerHub.Repository[] = await dockerHub.getRepositories(user.username);
        const namespaces = [...new Set(myRepos.map(item => item.namespace))];
        namespaces.forEach((namespace) => {
            let iconPath = {
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
            };
            let node = new DockerHubOrgNode(`${namespace}`, 'dockerHubNamespace', iconPath);
            node.userName = id.username;
            node.password = id.password;
            node.token = id.token;
            orgNodes.push(node);
        });

        return orgNodes;
    }

    private async getCustomRegistries(): Promise<CustomRegistryNode[]> {
        let iconPath = {
            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
        };
        // tslint:disable-next-line:no-http-string
        return [new CustomRegistryNode('localhost:5000', 'customRegistryNode'/*asdf*/, 'http://localhost:5000', 'a', 'b')];
    }

    private async getAzureRegistries(): Promise<AzureRegistryNode[] | AzureLoadingNode[] | AzureNotSignedInNode[]> {

        if (!this._azureAccount) {
            return [];
        }

        const loggedIntoAzure: boolean = await this._azureAccount.waitForLogin()
        let azureRegistryNodes: AzureRegistryNode[] = [];

        if (this._azureAccount.status === 'Initializing' || this._azureAccount.status === 'LoggingIn') {
            return [new AzureLoadingNode()];
        }

        if (this._azureAccount.status === 'LoggedOut') {
            return [new AzureNotSignedInNode()];
        }

        if (loggedIntoAzure) {
            const subs: SubscriptionModels.Subscription[] = this.getFilteredSubscriptions();

            const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
            let subsAndRegistries: { 'subscription': SubscriptionModels.Subscription, 'registries': ContainerModels.RegistryListResult, 'client': any }[] = [];
            //Acquire each subscription's data simultaneously
            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let i = 0; i < subs.length; i++) {
                subPool.addTask(async () => {
                    const client = new ContainerRegistryManagement(this.getCredentialByTenantId(subs[i].tenantId), subs[i].subscriptionId);
                    subsAndRegistries.push({
                        'subscription': subs[i],
                        'registries': await client.registries.list(),
                        'client': client
                    });
                });
            }
            await subPool.runAll();

            const regPool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let i = 0; i < subsAndRegistries.length; i++) {
                const client = subsAndRegistries[i].client;
                const registries = subsAndRegistries[i].registries;
                const subscription = subsAndRegistries[i].subscription;

                //Go through the registries and add them to the async pool
                // tslint:disable-next-line:prefer-for-of // Grandfathered in
                for (let j = 0; j < registries.length; j++) {
                    if (registries[j].adminUserEnabled && !registries[j].sku.tier.includes('Classic')) {
                        const resourceGroup: string = registries[j].id.slice(registries[j].id.search('resourceGroups/') + 'resourceGroups/'.length, registries[j].id.search('/providers/'));
                        regPool.addTask(async () => {
                            let creds = await client.registries.listCredentials(resourceGroup, registries[j].name);
                            let iconPath = {
                                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
                            };
                            let node = new AzureRegistryNode(registries[j].loginServer, 'azureRegistryNode', iconPath, this._azureAccount);
                            node.type = RegistryType.Azure;
                            node.password = creds.passwords[0].value;
                            node.userName = creds.username;
                            node.subscription = subscription;
                            node.registry = registries[j];
                            azureRegistryNodes.push(node);
                        });
                    }
                }
            }
            await regPool.runAll();

            function sortFunction(a: AzureRegistryNode, b: AzureRegistryNode): number {
                return a.registry.loginServer.localeCompare(b.registry.loginServer);
            }
            azureRegistryNodes.sort(sortFunction);
            return azureRegistryNodes;
        }
    }

    private getCredentialByTenantId(tenantId: string): ServiceClientCredentials {

        const session = this._azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }

    private getFilteredSubscriptions(): SubscriptionModels.Subscription[] {

        if (this._azureAccount) {
            return this._azureAccount.filters.map<SubscriptionModels.Subscription>(filter => {
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
        } else {
            return [];
        }
    }
}
