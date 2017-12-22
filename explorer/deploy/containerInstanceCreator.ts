/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureAccountWrapper } from './azureAccountWrapper';
import { WizardBase, WizardResult, WizardStep, SubscriptionStepBase, QuickPickItemWithData, UserCancelledError } from './wizard';
import { SubscriptionModels, ResourceManagementClient, ResourceModels } from 'azure-arm-resource';
import ContainerInstanceManagementClient = require('azure-arm-containerinstance');
import * as ContainerInstanceModels from '../../node_modules/azure-arm-containerinstance/lib/models';
import * as util from './util';
import { AzureImageNode } from '../models/azureRegistryNodes';
import { DockerHubImageNode } from '../models/dockerHubNodes';
import * as path from 'path';
import * as fs from 'fs';

export class ContainerInstanceCreator extends WizardBase {
    constructor(output: vscode.OutputChannel, readonly azureAccount: AzureAccountWrapper, context: AzureImageNode | DockerHubImageNode, subscription?: SubscriptionModels.Subscription) {
        super(output);
        this.steps.push(new SubscriptionStep(this, azureAccount, subscription));
        this.steps.push(new ResourceGroupStep(this, azureAccount));
        this.steps.push(new OsTypeStep(this));
        this.steps.push(new PortsStep(this));
        this.steps.push(new ContainerInstanceStep(this, azureAccount, context));
    }

    async run(promptOnly = false): Promise<WizardResult> {
        // If not signed in, execute the sign in command and wait for it...
        if (this.azureAccount.signInStatus !== 'LoggedIn') {
            await vscode.commands.executeCommand(util.getSignInCommandString());
        }
        // Now check again, if still not signed in, cancel.
        if (this.azureAccount.signInStatus !== 'LoggedIn') {
            return {
                status: 'Cancelled',
                step: this.steps[0],
                error: null
            };
        }

        return super.run(promptOnly);
    }

    protected beforeExecute(step: WizardStep, stepIndex: number) {
        if (stepIndex == 0) {
            this.writeline('Start creating new Container Instance...');
        }
    }

    protected onExecuteError(step: WizardStep, stepIndex: number, error: Error) {
        if (error instanceof UserCancelledError) {
            return;
        }
        this.writeline(`Failed to create new Container Instance - ${error.message}`);
        this.writeline('');
    }
}

class ContainerInstanceCreatorStepBase extends WizardStep {
    protected constructor(wizard: WizardBase, stepTitle: string, readonly azureAccount: AzureAccountWrapper) {
        super(wizard, stepTitle);
    }

    protected getSelectedSubscription(): SubscriptionModels.Subscription {
        const subscriptionStep = <SubscriptionStep>this.wizard.findStep(step => step instanceof SubscriptionStep, 'The Wizard must have a SubscriptionStep.');

        if (!subscriptionStep.subscription) {
            throw new Error('A subscription must be selected first.');
        }

        return subscriptionStep.subscription;
    }

    protected getSelectedResourceGroup(): ResourceModels.ResourceGroup {
        const resourceGroupStep = <ResourceGroupStep>this.wizard.findStep(step => step instanceof ResourceGroupStep, 'The Wizard must have a ResourceGroupStep.');

        if (!resourceGroupStep.resourceGroup) {
            throw new Error('A resource group must be selected first.');
        }

        return resourceGroupStep.resourceGroup;
    }

    protected getSelectedOsType(): string {
        const osTypeStep = <OsTypeStep>this.wizard.findStep(step => step instanceof OsTypeStep, 'The Wizard must have a OsTypeStep.');

        if (!osTypeStep.osType) {
            throw new Error('An OS type must be selected first.');
        }

        return osTypeStep.osType;
    }

    protected getInputPorts(): number[] {
        const portsStep = <PortsStep>this.wizard.findStep(step => step instanceof PortsStep, 'The Wizard must have a PortsStep.');
        return portsStep.ports;
    }
}

class SubscriptionStep extends SubscriptionStepBase {
    constructor(wizard: WizardBase, azureAccount: AzureAccountWrapper, subscrption?: SubscriptionModels.Subscription) {
        super(wizard, 'Select subscription', azureAccount);
        this._subscription = subscrption;
    }

    async prompt(): Promise<void> {
        if (!!this.subscription) {
            return;
        }

        const quickPickItems = await this.getSubscriptionsAsQuickPickItems();
        if (quickPickItems.length === 1) {
            this._subscription = quickPickItems[0].data;
        } else {
            const quickPickOptions = { placeHolder: `Select the subscription where the new Container Instance will be created in. (${this.stepProgressText})` };
            const result = await this.showQuickPick(quickPickItems, quickPickOptions);
            this._subscription = result.data;
        }
    }

    async execute(): Promise<void> {
        this.wizard.writeline(`The new Container Instance will be created in subscription "${this.subscription.displayName}" (${this.subscription.subscriptionId}).`);
    }
}

class ResourceGroupStep extends ContainerInstanceCreatorStepBase {
    private _createNew: boolean;
    private _rg: ResourceModels.ResourceGroup;

    constructor(wizard: WizardBase, azureAccount: AzureAccountWrapper) {
        super(wizard, 'Select or create resource group', azureAccount);
    }

    async prompt(): Promise<void> {
        const createNewItem: QuickPickItemWithData<ResourceModels.ResourceGroup> = {
            label: '$(plus) Create New Resource Group',
            description: '',
            data: null
        };
        const quickPickItems = [createNewItem];
        const quickPickOptions = { placeHolder: `Select the resource group where the new Container Instance will be created in. (${this.stepProgressText})` };
        const subscription = this.getSelectedSubscription();
        const resourceClient = new ResourceManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
        var resourceGroups: ResourceModels.ResourceGroup[];
        var locations: SubscriptionModels.Location[];
        const resourceGroupsTask = util.listAll(resourceClient.resourceGroups, resourceClient.resourceGroups.list());
        const locationsTask = this.azureAccount.getLocationsBySubscription(this.getSelectedSubscription());
        await Promise.all([resourceGroupsTask, locationsTask]).then(results => {
            resourceGroups = results[0];
            locations = results[1];
            resourceGroups.forEach(rg => {
                quickPickItems.push({
                    label: rg.name,
                    description: `(${locations.find(l => l.name.toLowerCase() === rg.location.toLowerCase()).displayName})`,
                    detail: '',
                    data: rg
                });
            });
        });

        const result = await this.showQuickPick(quickPickItems, quickPickOptions);

        if (result !== createNewItem) {
            const rg = result.data;
            this._createNew = false;
            this._rg = rg;
            return;
        }

        const newRgName = await this.showInputBox({
            prompt: 'Enter the name of the new resource group.',
            validateInput: (value: string) => {
                value = value.trim();

                if (resourceGroups.findIndex(rg => rg.name.localeCompare(value) === 0) >= 0) {
                    return `Resource group name "${value}" already exists.`;
                }

                if (!value.match(/^[a-z0-9.\-_()]{0,89}[a-z0-9\-_()]$/ig)) {
                    return 'Resource group name should be 1-90 characters long and can only include alphanumeric characters, periods, ' +
                        'underscores, hyphens and parenthesis and cannot end in a period.';
                }

                return null;
            }
        });
        const locationPickItems = locations.map<QuickPickItemWithData<SubscriptionModels.Location>>(location => {
            return {
                label: location.displayName,
                description: `(${location.name})`,
                detail: '',
                data: location
            };
        });
        const locationPickOptions = { placeHolder: 'Select the location of the new resource group.' };
        const pickedLocation = await this.showQuickPick(locationPickItems, locationPickOptions);

        this._createNew = true;
        this._rg = {
            name: newRgName,
            location: pickedLocation.data.name
        }
    }

    async execute(): Promise<void> {
        if (!this._createNew) {
            this.wizard.writeline(`Existing resource group "${this._rg.name} (${this._rg.location})" will be used.`);
            return;
        }

        this.wizard.writeline(`Creating new resource group "${this._rg.name} (${this._rg.location})"...`);
        const subscription = this.getSelectedSubscription();
        const resourceClient = new ResourceManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
        this._rg = await resourceClient.resourceGroups.createOrUpdate(this._rg.name, this._rg);
        this.wizard.writeline(`Resource group created.`);
    }

    get resourceGroup(): ResourceModels.ResourceGroup {
        return this._rg;
    }

    get createNew(): boolean {
        return this._createNew;
    }
}

class OsTypeStep extends WizardStep {
    private _osType: string;

    constructor(wizard: WizardBase) {
        super(wizard, 'Select OS type');
    }

    async prompt(): Promise<void> {
        const quickPickItems = [
            {
                label: 'Linux',
                description: 'Use Linux as the container OS type',
                detail: '',
                data: 'Linux'
            },
            {
                label: 'Windows',
                description: 'Use Windows as the container OS type',
                detail: '',
                data: 'Windows'
            }
        ];

        const quickPickOptions = { placeHolder: `Select the container OS type. (${this.stepProgressText})` };
        const result = await this.showQuickPick(quickPickItems, quickPickOptions);
        this._osType = result.data;
    }

    async execute(): Promise<void> {
        this.wizard.writeline(`Container OS type selected "${this.osType}".`);
    }

    get osType(): string {
        return this._osType;
    }
}

class PortsStep extends WizardStep {
    private _ports: number[];

    constructor(wizard: WizardBase) {
        super(wizard, "Enter ports to open");
    }

    async prompt(): Promise<void> {
        const inputBoxOptions = {
            prompt: `Enter ports to open separeted by ',' or just Enter to skip. (${this.stepProgressText})`,
            value: " ",
            validateInput: (value: string) => {
                if (!value || value.trim().length == 0) return null;

                let portsStr = value.trim().split(',');

                if (portsStr.length > 5) {
                    return 'Can only open up to 5 ports';
                }

                for (let portStr of portsStr) {
                    let port = Number.parseInt(portStr);
                    if (Number.isNaN(port) || port <= 0 || port > 65535) {
                        return `${portStr} is an invalid port`;
                    }
                }

                return null;
            }
        };

        let input = await this.showInputBox(inputBoxOptions);
        input = input.trim();

        if (input && input.length > 0) {
            this._ports = input.split(',').map<number>(portStr => {
                return Number(portStr);
            });
        }
    }

    async execute(): Promise<void> {
        if (this._ports) {
            this.wizard.writeline(`The container will be created with a public IP and ports "${this.ports}".`);
        }
    }

    get ports(): number[] {
        return this._ports;
    }
}

class ContainerInstanceStep extends ContainerInstanceCreatorStepBase {
    private _containerGroup: ContainerInstanceModels.ContainerGroup;
    private _command: string;
    private _serverUrl: string;
    private _serverUserName: string;
    private _serverPassword: string;
    private _imageName: string;

    constructor(wizard: WizardBase, azureAccount: AzureAccountWrapper, context: AzureImageNode | DockerHubImageNode) {
        super(wizard, 'Create a container instance', azureAccount);

        this._serverUrl = context.serverUrl;
        this._serverPassword = context.password;
        this._serverUserName = context.userName;
        this._imageName = context.label.split(" ")[0];
    }

    async prompt(): Promise<void> {
        const rg = this.getSelectedResourceGroup();
        let location = rg.location;
        const osType = this.getSelectedOsType();
        const ports = this.getInputPorts();

        let containerGroupName = await this.showInputBox({
            prompt: `Enter a unique name for the new container instance. (${this.stepProgressText})`,
            validateInput: (value: string) => {
                value = value ? value.trim() : '';

                if (!value.match(/^[a-z0-9\-]{1,60}$/ig)) {
                    return 'App name should be 1-60 characters long and can only include alphanumeric characters and hyphens.';
                }

                return null;
            }
        });

        let imageRegistryCredential: ContainerInstanceModels.ImageRegistryCredential;
        if (this._serverUrl.length > 0) {
            imageRegistryCredential = {
                server: this._serverUrl,
                username: this._serverUserName,
                password: this._serverPassword
            };
            this._imageName = `${this._serverUrl}/${this._imageName}`;
        }

        if (this._serverUserName.length > 0) {
            this._imageName = `${this._serverUserName}/${this._imageName}`;
        }

        let container = {
            name: containerGroupName.trim(),
            image: this._imageName,
            ports: ports ?
                ports.map<ContainerInstanceModels.ContainerPort>(p => {
                    return {
                        protocol: "TCP",
                        port: p
                    };
                })
                : undefined,
            resources: {
                requests: {
                    memoryInGB: 1.5,
                    cpu: 1.0
                }
            }
        };

        this._containerGroup = {
            name: containerGroupName.trim(),
            location: location,
            containers: [container],
            restartPolicy: "Never",
            osType: osType,
            ipAddress: ports ?
                {
                    ports: ports.map<ContainerInstanceModels.Port>(p => {
                        return {
                            port: p,
                            protocol: "TCP"
                        };
                    })
                }
                : undefined,
            imageRegistryCredentials: imageRegistryCredential ? [imageRegistryCredential] : undefined
        };
    }

    async execute(): Promise<void> {
        this.wizard.writeline(`Creating new container instance "${this._containerGroup.name}"...`);
        const subscription = this.getSelectedSubscription();
        const rg = this.getSelectedResourceGroup();
        const containerInstanceClient = new ContainerInstanceManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);

        this._containerGroup = await containerInstanceClient.containerGroups.createOrUpdate(rg.name, this._containerGroup.name, this._containerGroup);
        this.wizard.writeline(`Created new container intance:\n${this._containerGroup.id}`);
    }
}