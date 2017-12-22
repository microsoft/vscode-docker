import * as vscode from 'vscode';
import * as path from 'path';
import { NodeBase } from './nodeBase';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';
import ContainerInstanceManagementClient = require('azure-arm-containerinstance');
import * as ContainerInstanceModels from '../../node_modules/azure-arm-containerinstance/lib/models';
import { ServiceClientCredentials } from 'ms-rest';
import { SubscriptionClient, ResourceManagementClient, SubscriptionModels } from 'azure-arm-resource';
import { AzureContainerGroupNode, AzureNotSignedInNode, AzureLoadingNode } from './azureContainerInstanceNodes';

export class DeploymentRootNode extends NodeBase {
    private _azureAccount: AzureAccount;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>,
        public readonly azureAccount?: AzureAccount 
    ) {
        super(label);
        this._azureAccount = azureAccount;

        if (this._azureAccount && this.eventEmitter && this.contextValue === 'azureContainerInstanceRootNode') {

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

    async getChildren(element: DeploymentRootNode): Promise<NodeBase[]> {
        if (element.contextValue === 'azureContainerInstanceRootNode') {
            return this.getAzureContainerInstances();
        } else {
            return [];
        }
    }

    private async getAzureContainerInstances(): Promise<AzureContainerGroupNode[] | AzureLoadingNode[] | AzureNotSignedInNode[]> {
        if (!this._azureAccount) {
            return [];
        }

        const loggedIntoAzure: boolean = await this._azureAccount.waitForLogin()
        const azureContainerGroupNodes: AzureContainerGroupNode[] = [];

        if (this._azureAccount.status === 'Initializing' || this._azureAccount.status === 'LoggingIn') {
            return [new AzureLoadingNode()];
        }

        if (this._azureAccount.status === 'LoggedOut') {
            return [new AzureNotSignedInNode()];
        }

        if (loggedIntoAzure) {
            const iconPath = {
                light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'Registry_16x.svg'),
                dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'Registry_16x.svg')
            };

            const subs: SubscriptionModels.Subscription[] = this.getFilteredSubscriptions();

            for (let sub of subs) {
                const client = new ContainerInstanceManagementClient(this.getCredentialByTenantId(sub.tenantId), sub.subscriptionId);
                const containerGroups = await client.containerGroups.list();

                for (let containerGroup of containerGroups) {
                    let node = new AzureContainerGroupNode(containerGroup.name, "azureContainerGroupNode", iconPath, this._azureAccount);
                    node.containerGroup = containerGroup;
                    node.subscription = sub;
                    azureContainerGroupNodes.push(node);
                }
            }
        }

        return azureContainerGroupNodes;
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