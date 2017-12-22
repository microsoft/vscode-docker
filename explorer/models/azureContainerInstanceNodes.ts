import * as vscode from 'vscode';
import * as path from 'path';
import { NodeBase } from './nodeBase';
import * as ContainerInstanceModels from '../../node_modules/azure-arm-containerinstance/lib/models';
import ContainerInstanceManagementClient = require('azure-arm-containerinstance');
import { SubscriptionModels } from 'azure-arm-resource';
import { ServiceClientCredentials } from 'ms-rest';
import { AzureAccount, AzureSession } from '../../typings/azure-account.api';

export class AzureContainerGroupNode extends NodeBase {
    private _azureAccount: AzureAccount;
    public containerGroup: ContainerInstanceModels.ContainerGroup;
    public subscription: SubscriptionModels.Subscription;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {},
        public readonly azureAccount?: AzureAccount 
    ) {
        super(label);
        this._azureAccount = azureAccount;
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.Collapsed,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }

    async getChildren(element: AzureContainerGroupNode): Promise<AzureContainerNode[]> {
        const resourceGroup = /\/resourceGroups\/(\S+)\/providers\//i.exec(element.containerGroup.id)[1];
        const sub = element.subscription;
        const client = new ContainerInstanceManagementClient(this.getCredentialByTenantId(sub.tenantId), sub.subscriptionId);
        const containerGroup = await client.containerGroups.get(resourceGroup, element.containerGroup.name);

        return containerGroup.containers ?
            containerGroup.containers.map<AzureContainerNode>(c => {
                let label: string;
                let contextValue: string;
                let iconPath: any = {};

                if (containerGroup.provisioningState === 'Creating'
                    || (containerGroup.instanceView && containerGroup.instanceView.state === 'Pending')) {
                    label = `${c.name} (pending)`;
                    contextValue = 'pendingAzureContainerNode';
                    iconPath = {
                        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'runningContainer.svg'),
                        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'runningContainer.svg')
                    };
                } else if (c.instanceView && c.instanceView.currentState) {
                    if (c.instanceView.currentState.state === 'Running') {
                        label = `${c.name} (running)`;
                        contextValue = 'runningAzureContainerNode';
                        iconPath = {
                            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'runningContainer.svg'),
                            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'runningContainer.svg')
                        };
                    } else if (c.instanceView.currentState.state === 'Terminated') {
                        label = `${c.name} (stopped)`;
                        contextValue = 'stoppedAzureContainerNode';
                        iconPath = {
                            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'stoppedContainer.svg'),
                            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'stoppedContainer.svg')
                        };
                    } else if (c.instanceView.currentState.state === 'Waiting') {
                        label = `${c.name} (pending)`;
                        contextValue = 'pendingAzureContainerNode';
                        iconPath = {
                            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'runningContainer.svg'),
                            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'runningContainer.svg')
                        };
                    } else {
                        label = `${c.name} (unknown)`;
                        contextValue = 'unknownAzureContainerNode';
                        iconPath = {
                            light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'stoppedContainer.svg'),
                            dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'stoppedContainer.svg')
                        };
                    }
                } else {
                    label = `${c.name} (unknown)`;
                    contextValue = 'unknownAzureContainerNode';
                    iconPath = {
                        light: path.join(__filename, '..', '..', '..', '..', 'images', 'light', 'stoppedContainer.svg'),
                        dark: path.join(__filename, '..', '..', '..', '..', 'images', 'dark', 'stoppedContainer.svg')
                    };
                }

                let node = new AzureContainerNode(label, contextValue, iconPath);
                node.container = c;
                node.containerGroup = element.containerGroup;
                node.subscription = element.subscription;

                return node;
            }) :
            [];
    }

    private getCredentialByTenantId(tenantId: string): ServiceClientCredentials {

        const session = this._azureAccount.sessions.find((s, i, array) => s.tenantId.toLowerCase() === tenantId.toLowerCase());

        if (session) {
            return session.credentials;
        }

        throw new Error(`Failed to get credentials, tenant ${tenantId} not found.`);
    }
}

export class AzureContainerNode extends NodeBase {
    public containerGroup: ContainerInstanceModels.ContainerGroup;
    public subscription: SubscriptionModels.Subscription;
    public container: ContainerInstanceModels.Container;

    constructor(
        public readonly label: string,
        public readonly contextValue: string,
        public readonly iconPath: any = {}
    ) {
        super(label)
    }

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None,
            contextValue: this.contextValue,
            iconPath: this.iconPath
        }
    }
}

export class AzureNotSignedInNode extends NodeBase {
    constructor() {
        super('Sign in to Azure...');
    }

    getTreeItem(): vscode.TreeItem {
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

    getTreeItem(): vscode.TreeItem {
        return {
            label: this.label,
            collapsibleState: vscode.TreeItemCollapsibleState.None
        }
    }
}