import * as vscode from 'vscode';
import * as path from 'path';
import * as dockerHub from './dockerHubUtils'
import * as keytarType from 'keytar';
import * as ContainerModels from '../../node_modules/azure-arm-containerregistry/lib/models';
import * as ContainerOps from '../../node_modules/azure-arm-containerregistry/lib/operations';
import ContainerRegistryManagementClient = require('azure-arm-containerregistry');
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import { AzureRegistryNode, AzureLoadingNode, AzureNotSignedInNode } from './azureRegistryNodes';
import { DockerHubOrgNode } from './dockerHubNodes';
import { NodeBase } from './nodeBase';
import { RegistryType } from './registryType';
import { ServiceClientCredentials } from 'ms-rest';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';

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
        try {
            this._keytar = require(`${vscode.env.appRoot}/node_modules/keytar`);
        } catch (e) {
            // unable to find keytar
        }

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

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
        }
    }

    async getChildren(element: RegistryRootNode): Promise<NodeBase[]> {
        if (element.contextValue === 'azureRegistryRootNode') {
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
            id.username = await this._keytar.getPassword('vscode-docker', 'dockerhub.username');
            id.password = await this._keytar.getPassword('vscode-docker', 'dockerhub.password');
        }

        if (!id.token) {
            id = await dockerHub.dockerHubLogin();
            if (id && id.token) {
                if (this._keytar) {
                    this._keytar.setPassword('vscode-docker', 'dockerhub.token', id.token);
                    this._keytar.setPassword('vscode-docker', 'dockerhub.password', id.password);
                    this._keytar.setPassword('vscode-docker', 'dockerhub.username', id.username);
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

    private async getAzureRegistries(): Promise<AzureRegistryNode[] | AzureLoadingNode[] | AzureNotSignedInNode[]> {

        if (!this._azureAccount) {
            return [];
        }

        const loggedIntoAzure: boolean = await this._azureAccount.waitForLogin()
        const azureRegistryNodes: AzureRegistryNode[] = [];

        if (this._azureAccount.status === 'Initializing' || this._azureAccount.status === 'LoggingIn') {
            return [new AzureLoadingNode()];
        }

        if (this._azureAccount.status === 'LoggedOut') {
            return [new AzureNotSignedInNode()];
        }

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
                            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
                        };
                        let node = new AzureRegistryNode(registries[j].loginServer, 'registry', iconPath, this._azureAccount);
                        node.type = RegistryType.Azure;
                        node.password = creds.passwords[0].value;
                        node.userName = creds.username;
                        node.subscription = subs[i];
                        azureRegistryNodes.push(node);
                    }
                }
            }
        }

        return azureRegistryNodes;
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


