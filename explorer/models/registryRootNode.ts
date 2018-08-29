/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as vscode from 'vscode';
import { parseError } from 'vscode-azureextensionui';
import { keytarConstants, MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../../constants';
import { ext } from '../../extensionVariables';
import { AzureAccount } from '../../typings/azure-account.api';
import { AsyncPool } from '../../utils/asyncpool';
import { AzureUtilityManager } from '../../utils/azureUtilityManager';
import * as dockerHub from '../utils/dockerHubUtils'
import { AzureLoadingNode, AzureNotSignedInNode, AzureRegistryNode } from './azureRegistryNodes';
import { getCustomRegistries } from './customRegistries';
import { CustomRegistryNode } from './customRegistryNodes';
import { DockerHubOrgNode } from './dockerHubNodes';
import { NodeBase } from './nodeBase';

export class RegistryRootNode extends NodeBase {
    private _azureAccount: AzureAccount;

    constructor(
        public readonly label: string,
        public readonly contextValue: 'dockerHubRootNode' | 'azureRegistryRootNode' | 'customRootNode',
        public readonly eventEmitter: vscode.EventEmitter<NodeBase>,
        public readonly azureAccount?: AzureAccount
    ) {
        super(label);

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
            assert(element.contextValue === 'customRootNode');
            return await this.getCustomRegistryNodes();
        }
    }

    private async getDockerHubOrgs(): Promise<DockerHubOrgNode[]> {
        const orgNodes: DockerHubOrgNode[] = [];

        let id: { username: string, password: string, token: string } = { username: null, password: null, token: null };

        if (ext.keytar) {
            id.token = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey);
            id.username = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey);
            id.password = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey);
        }

        if (!id.token) {
            id = await dockerHub.dockerHubLogin();

            if (id && id.token && ext.keytar) {
                await ext.keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey, id.token);
                await ext.keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey, id.password);
                await ext.keytar.setPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey, id.username);
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
            let node = new DockerHubOrgNode(`${namespace}`);
            node.userName = id.username;
            node.password = id.password;
            node.token = id.token;
            orgNodes.push(node);
        });

        return orgNodes;
    }

    private async getCustomRegistryNodes(): Promise<CustomRegistryNode[]> {
        let registries = await getCustomRegistries();
        let nodes: CustomRegistryNode[] = [];
        for (let registry of registries) {
            nodes.push(new CustomRegistryNode(vscode.Uri.parse(registry.url).authority, registry));
        }

        return nodes;
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
            const subscriptions: SubscriptionModels.Subscription[] = AzureUtilityManager.getInstance().getFilteredSubscriptionList();

            const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
            let subsAndRegistries: { 'subscription': SubscriptionModels.Subscription, 'registries': ContainerModels.RegistryListResult }[] = [];
            //Acquire each subscription's data simultaneously
            for (let sub of subscriptions) {
                subPool.addTask(async () => {
                    const client = AzureUtilityManager.getInstance().getContainerRegistryManagementClient(sub);
                    try {
                        let regs: ContainerModels.Registry[] = await client.registries.list();
                        subsAndRegistries.push({
                            'subscription': sub,
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
                            let node = new AzureRegistryNode(
                                registries[j].loginServer,
                                this._azureAccount,
                                registries[j],
                                subscription);
                            azureRegistryNodes.push(node);
                        });
                    }
                }
            }
            await regPool.runAll();

            function compareFn(a: AzureRegistryNode, b: AzureRegistryNode): number {
                return a.registry.loginServer.localeCompare(b.registry.loginServer);
            }
            azureRegistryNodes.sort(compareFn);
            return azureRegistryNodes;
        }
    }
}
