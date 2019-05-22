/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as ContainerModels from 'azure-arm-containerregistry/lib/models';
import { SubscriptionModels } from 'azure-arm-resource';
import * as vscode from 'vscode';
import { callWithTelemetryAndErrorHandling, IActionContext, parseError } from 'vscode-azureextensionui';
import { keytarConstants, MAX_CONCURRENT_REQUESTS, MAX_CONCURRENT_SUBSCRIPTON_REQUESTS } from '../../src/constants';
import { ext } from '../../src/extensionVariables';
import { AsyncPool } from '../../src/utils/asyncpool';
import { AzureUtilityManager } from '../../src/utils/azureUtilityManager';
import { getLoginServer } from '../../src/utils/nonNull';
import { AzureAccount } from '../../typings/azure-account.api';
import * as dockerHub from '../utils/dockerHubUtils';
import { AzureLoadingNode, AzureNotSignedInNode, AzureRegistryNode } from './azureRegistryNodes';
import { getCustomRegistries } from './customRegistries';
import { CustomRegistryNode } from './customRegistryNodes';
import { DockerHubOrgNode } from './dockerHubNodes';
import { NodeBase } from './nodeBase';

export class RegistryRootNode extends NodeBase {
    private _azureAccount: AzureAccount | undefined;

    constructor(
        public readonly label: string,
        public readonly contextValue: 'dockerHubRootNode' | 'azureRegistryRootNode' | 'customRootNode',
        public readonly eventEmitter: vscode.EventEmitter<NodeBase> | undefined, // Needed only for Azure
        public readonly azureAccount: AzureAccount | undefined // Needed only for Azure
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
        return await callWithTelemetryAndErrorHandling('getChildren', async (context: IActionContext) => {
            context.telemetry.suppressIfSuccessful = true;
            context.telemetry.properties.source = 'registryRootNode';

            if (element.contextValue === 'azureRegistryRootNode') {
                return this.getAzureRegistries();
            } else if (element.contextValue === 'dockerHubRootNode') {
                return this.getDockerHubOrgs();
            } else {
                assert(element.contextValue === 'customRootNode');
                return await this.getCustomRegistryNodes();
            }
        });
    }

    private async getDockerHubOrgs(): Promise<(DockerHubOrgNode | DockerHubNotSignedInNode)[]> {
        let id: { username: string, password: string, token: string } | undefined;

        if (ext.keytar) {
            let token = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubTokenKey);
            let username = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubUserNameKey);
            let password = await ext.keytar.getPassword(keytarConstants.serviceId, keytarConstants.dockerHubPasswordKey);
            if (token && username && password) {
                id = { token, username, password };
            }
        }

        if (id && id.token) {
            const orgNodes: DockerHubOrgNode[] = [];

            dockerHub.setDockerHubToken(id.token);

            if (id && id.token) {
                const user: dockerHub.User = await dockerHub.getUser();
                const myRepos: dockerHub.Repository[] = await dockerHub.getRepositories(user.username);
                const namespaces = [...new Set(myRepos.map(item => item.namespace))];
                namespaces.forEach((namespace) => {
                    let node = new DockerHubOrgNode(`${namespace}`, id.username, id.password, id.token);
                    orgNodes.push(node);
                });
            }

            return orgNodes;
        } else {
            return [new DockerHubNotSignedInNode()];
        }
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
            const subscriptions: SubscriptionModels.Subscription[] = await AzureUtilityManager.getInstance().getFilteredSubscriptionList();

            const subPool = new AsyncPool(MAX_CONCURRENT_SUBSCRIPTON_REQUESTS);
            let subsAndRegistries: { 'subscription': SubscriptionModels.Subscription, 'registries': ContainerModels.RegistryListResult }[] = [];
            //Acquire each subscription's data simultaneously
            for (let sub of subscriptions) {
                subPool.addTask(async () => {
                    const client = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(sub);
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
                    if (!(registries[j].sku.tier || '').includes('Classic')) {
                        regPool.addTask(async () => {
                            let node = new AzureRegistryNode(
                                getLoginServer(registries[j]),
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
                return getLoginServer(a.registry).localeCompare(getLoginServer(b.registry));
            }
            azureRegistryNodes.sort(compareFn);
            return azureRegistryNodes;
        } else {
            return [];
        }
    }
}

export class DockerHubNotSignedInNode extends NodeBase {
    constructor() {
        super('Log In to Docker Hub...');
    }

    public readonly contextValue: string = 'dockerHubNotSignedInNode';

    public getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            command: {
                title: this.label,
                command: 'vscode-docker.dockerHubLogin'
            },
            collapsibleState: vscode.TreeItemCollapsibleState.None
        }
    }
}
