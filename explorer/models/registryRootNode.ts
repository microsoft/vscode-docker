import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as keytarType from 'keytar';
import { ServiceClientCredentials } from 'ms-rest';
import * as path from 'path';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { keytarConstants, MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../../constants';
import { AzureAccount } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import * as dockerHub from '../utils/dockerHubUtils'
import { getCoreNodeModule } from '../utils/utils';
import { AzureLoadingNode, AzureNotSignedInNode, AzureRegistryNode } from './azureRegistryNodes';
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
            return [];
        }
    }

    private async getDockerHubOrgs(): Promise<DockerHubOrgNode[]> {
        const orgNodes: DockerHubOrgNode[] = [];

        let id: { username: string, password: string, token: string } = { username: null, password: null, token: null };

        if (this._keytar) {
            id.token = await this._keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey);
            id.username = await this._keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey);
            id.password = await this._keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey);
        }

        if (!id.token) {
            id = await dockerHub.dockerHubLogin();

            if (id && id.token) {
                if (this._keytar) {
                    await this._keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey, id.token);
                    await this._keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey, id.password);
                    await this._keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey, id.username);
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
            let subsAndRegistries: { 'subscription': SubscriptionModels.Subscription, 'registries': ContainerModels.RegistryListResult }[] = [];
            //Acquire each subscription's data simultaneously
            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let i = 0; i < subs.length; i++) {
                subPool.addTask(async () => {
                    const client = new ContainerRegistryManagement(this.getCredentialByTenantId(subs[i].tenantId), subs[i].subscriptionId);
                    try {
                        let regs: ContainerModels.Registry[] = await client.registries.list();
                        subsAndRegistries.push({
                            'subscription': subs[i],
                            'registries': regs
                        });
                    } catch (error) {
                        vscode.window.showErrorMessage(parseError(error).message);
                    }
                });
            }
            await subPool.runAll();

            const regPool = new AsyncPool(MAX_CONCURRENT_REQUESTS);
            // tslint:disable-next-line:prefer-for-of // Grandfathered in
            for (let i = 0; i < subsAndRegistries.length; i++) {
                const registries = subsAndRegistries[i].registries;
                const subscription = subsAndRegistries[i].subscription;

                //Go through the registries and add them to the async pool
                // tslint:disable-next-line:prefer-for-of // Grandfathered in
                for (let j = 0; j < registries.length; j++) {
                    if (!registries[j].sku.tier.includes('Classic')) {
                        regPool.addTask(async () => {
                            let iconPath = {
                                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
                            };
                            let node = new AzureRegistryNode(registries[j].loginServer, 'azureRegistryNode', iconPath, this._azureAccount);
                            node.type = RegistryType.Azure;
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
