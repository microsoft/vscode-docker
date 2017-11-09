/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureAccountWrapper } from './azureAccountWrapper';
import { WizardBase, WizardResult, WizardStep, SubscriptionStepBase, QuickPickItemWithData, UserCancelledError } from './wizard';
import { SubscriptionModels, ResourceManagementClient, ResourceModels } from 'azure-arm-resource';
import WebSiteManagementClient = require('azure-arm-website');
import * as WebSiteModels from '../../node_modules/azure-arm-website/lib/models';
import * as util from './util';
import { AzureImageNode } from '../models/azureRegistryNodes';
import { DockerHubImageNode } from '../models/dockerHubNodes';
import * as path from 'path';
import * as fs from 'fs';

export class WebAppCreator extends WizardBase {
    constructor(output: vscode.OutputChannel, readonly azureAccount: AzureAccountWrapper, context: AzureImageNode | DockerHubImageNode, subscription?: SubscriptionModels.Subscription) {
        super(output);
        this.steps.push(new SubscriptionStep(this, azureAccount, subscription));
        this.steps.push(new ResourceGroupStep(this, azureAccount));
        this.steps.push(new AppServicePlanStep(this, azureAccount));
        this.steps.push(new WebsiteStep(this, azureAccount, context));
       
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

    get createdWebSite(): WebSiteModels.Site {
        const websiteStep = this.steps.find(step => step instanceof WebsiteStep);
        return (<WebsiteStep>websiteStep).website;
    }

    protected beforeExecute(step: WizardStep, stepIndex: number) {
        if (stepIndex == 0) {
            this.writeline('Start creating new Web App...');
        }
    }

    protected onExecuteError(step: WizardStep, stepIndex: number, error: Error) {
        if (error instanceof UserCancelledError) {
            return;
        }
        this.writeline(`Failed to create new Web App - ${error.message}`);
        this.writeline('');
    }
}

class WebAppCreatorStepBase extends WizardStep {
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

    protected getSelectedAppServicePlan(): WebSiteModels.AppServicePlan {
        const appServicePlanStep = <AppServicePlanStep>this.wizard.findStep(step => step instanceof AppServicePlanStep, 'The Wizard must have a AppServicePlanStep.');

        if (!appServicePlanStep.servicePlan) {
            throw new Error('An App Service Plan must be selected first.');
        }

        return appServicePlanStep.servicePlan;
    }

    protected getWebSite(): WebSiteModels.Site {
        const websiteStep = <WebsiteStep>this.wizard.findStep(step => step instanceof WebsiteStep, 'The Wizard must have a WebsiteStep.');

        if (!websiteStep.website) {
            throw new Error('A website must be created first.');
        }

        return websiteStep.website;
    }

    protected getImageInfo(): { serverUrl: string, serverUser: string, serverPassword: string} {
        const websiteStep = <WebsiteStep>this.wizard.findStep(step => step instanceof WebsiteStep, 'The Wizard must have a WebsiteStep.');
        if (!websiteStep.website) {
            throw new Error('A website must be created first.');
        }

        return websiteStep.imageInfo;
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
            const quickPickOptions = { placeHolder: `Select the subscription where the new Web App will be created in. (${this.stepProgressText})` };
            const result = await this.showQuickPick(quickPickItems, quickPickOptions);
            this._subscription = result.data;
        }
    }

    async execute(): Promise<void> {
        this.wizard.writeline(`The new Web App will be created in subscription "${this.subscription.displayName}" (${this.subscription.subscriptionId}).`);
    }
}

class ResourceGroupStep extends WebAppCreatorStepBase {
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
        const quickPickOptions = { placeHolder: `Select the resource group where the new Web App will be created in. (${this.stepProgressText})` };
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

class AppServicePlanStep extends WebAppCreatorStepBase {
    private _createNew: boolean;
    private _plan: WebSiteModels.AppServicePlan;

    constructor(wizard: WizardBase, azureAccount: AzureAccountWrapper) {
        super(wizard, 'Select or create App Service Plan', azureAccount);
    }

    async prompt(): Promise<void> {
        const createNewItem: QuickPickItemWithData<WebSiteModels.AppServicePlan> = {
            label: '$(plus) Create New App Service Plan',
            description: '',
            data: null
        };
        const quickPickItems = [createNewItem];
        const quickPickOptions = { placeHolder: `Select the App Service Plan for the new Web App. (${this.stepProgressText})` };
        const subscription = this.getSelectedSubscription();
        const client = new WebSiteManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
        // You can create a web app and associate it with a plan from another resource group.
        // That's why we use list instead of listByResourceGroup below; and show resource group name in the quick pick list.
        const plans = await util.listAll(client.appServicePlans, client.appServicePlans.list());

        plans.forEach(plan => {
            // Currently we only support Linux web apps.
            if (plan.kind.toLowerCase() === 'linux') {
                quickPickItems.push({
                    label: plan.appServicePlanName,
                    description: `${plan.sku.name} (${plan.geoRegion})`,
                    detail: plan.resourceGroup,
                    data: plan
                });
            }
        });

        const pickedItem = await this.showQuickPick(quickPickItems, quickPickOptions);

        if (pickedItem !== createNewItem) {
            this._createNew = false;
            this._plan = pickedItem.data;
            return;
        }

        // Prompt for new plan information.
        const rg = this.getSelectedResourceGroup();
        const newPlanName = await this.showInputBox({
            prompt: 'Enter the name of the new App Service Plan.',
            validateInput: (value: string) => {
                value = value.trim();

                if (plans.findIndex(plan => plan.resourceGroup.toLowerCase() === rg.name && value.localeCompare(plan.name) === 0) >= 0) {
                    return `App Service Plan name "${value}" already exists in resource group "${rg.name}".`;
                }

                if (!value.match(/^[a-z0-9\-]{0,39}$/ig)) {
                    return 'App Service Plan name should be 1-40 characters long and can only include alphanumeric characters and hyphens.';
                }

                return null;
            }
        });

        // Prompt for Pricing tier
        const pricingTiers: QuickPickItemWithData<WebSiteModels.SkuDescription>[] = [];
        const availableSkus = this.getPlanSkus();
        availableSkus.forEach(sku => {
            pricingTiers.push({
                label: sku.name,
                description: sku.tier,
                detail: '',
                data: sku
            });
        });
        const pickedSkuItem = await this.showQuickPick(pricingTiers, { placeHolder: 'Choose your pricing tier.' });
        const newPlanSku = pickedSkuItem.data;
        this._createNew = true;
        this._plan = {
            appServicePlanName: newPlanName,
            kind: 'linux',  // Currently we only support Linux web apps.
            sku: newPlanSku,
            location: rg.location,
            reserved: true  // The secret property - must be set to true to make it a Linux plan. Confirmed by the team who owns this API.
        };
    }

    async execute(): Promise<void> {
        if (!this._createNew) {
            this.wizard.writeline(`Existing App Service Plan "${this._plan.appServicePlanName} (${this._plan.sku.name})" will be used.`);
            return;
        }

        this.wizard.writeline(`Creating new App Service Plan "${this._plan.appServicePlanName} (${this._plan.sku.name})"...`);
        const subscription = this.getSelectedSubscription();
        const rg = this.getSelectedResourceGroup();
        const websiteClient = new WebSiteManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
        this._plan = await websiteClient.appServicePlans.createOrUpdate(rg.name, this._plan.appServicePlanName, this._plan);

        this.wizard.writeline(`App Service Plan created.`);
    }

    get servicePlan(): WebSiteModels.AppServicePlan {
        return this._plan;
    }

    get createNew(): boolean {
        return this._createNew;
    }

    private getPlanSkus(): WebSiteModels.SkuDescription[] {
        return [
            {
                name: 'S1',
                tier: 'Standard',
                size: 'S1',
                family: 'S',
                capacity: 1
            },
            {
                name: 'S2',
                tier: 'Standard',
                size: 'S2',
                family: 'S',
                capacity: 1
            },
            {
                name: 'S3',
                tier: 'Standard',
                size: 'S3',
                family: 'S',
                capacity: 1
            },
            {
                name: 'B1',
                tier: 'Basic',
                size: 'B1',
                family: 'B',
                capacity: 1
            },
            {
                name: 'B2',
                tier: 'Basic',
                size: 'B2',
                family: 'B',
                capacity: 1
            },
            {
                name: 'B3',
                tier: 'Basic',
                size: 'B3',
                family: 'B',
                capacity: 1
            }
        ];
    }
}

class WebsiteStep extends WebAppCreatorStepBase {
    private _website: WebSiteModels.Site;
    private _serverUrl: string;
    private _serverUserName: string;
    private _serverPassword: string;
    private _imageName: string;

    constructor(wizard: WizardBase, azureAccount: AzureAccountWrapper, context: AzureImageNode | DockerHubImageNode) {
        super(wizard, 'Create Web App', azureAccount);

        this._serverUrl = context.serverUrl;
        this._serverPassword = context.password;
        this._serverUserName = context.userName;
        this._imageName = context.label;

    }

    async prompt(): Promise<void> {
        const subscription = this.getSelectedSubscription();
        const client = new WebSiteManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);
        let siteName: string;
        let siteNameOkay = false;

        while (!siteNameOkay) {
            siteName = await this.showInputBox({
                prompt: `Enter a globally unique name for the new Web App. (${this.stepProgressText})`,
                validateInput: (value: string) => {
                    value = value ? value.trim() : '';

                    if (!value.match(/^[a-z0-9\-]{1,60}$/ig)) {
                        return 'App name should be 1-60 characters long and can only include alphanumeric characters and hyphens.';
                    }

                    return null;
                }
            });

            // Check if the name has already been taken...
            const nameAvailability = await client.checkNameAvailability(siteName, 'site');
            siteNameOkay = nameAvailability.nameAvailable;

            if (!siteNameOkay) {
                await vscode.window.showWarningMessage(nameAvailability.message);
            }
        }

        let linuxFXVersion: string;
        if (this._serverUrl.length > 0) {
            // azure container registry
            linuxFXVersion = 'DOCKER|' + this._serverUrl + '/' + this._imageName;
        } else {
            // dockerhub
            linuxFXVersion = 'DOCKER|' + this._serverUserName + '/' + this._imageName;
        }

        const rg = this.getSelectedResourceGroup();
        const plan = this.getSelectedAppServicePlan();

        this._website = {
            name: siteName.trim(),
            kind: 'app,linux',
            location: rg.location,
            serverFarmId: plan.id,
            siteConfig: {
                linuxFxVersion: linuxFXVersion
            }
        }
    }

    async execute(): Promise<void> {
        this.wizard.writeline(`Creating new Web App "${this._website.name}"...`);
        const subscription = this.getSelectedSubscription();
        const rg = this.getSelectedResourceGroup();
        const websiteClient = new WebSiteManagementClient(this.azureAccount.getCredentialByTenantId(subscription.tenantId), subscription.subscriptionId);

        // If the plan is also newly created, its resource ID won't be available at this step's prompt stage, but should be available now.
        if (!this._website.serverFarmId) {
            this._website.serverFarmId = this.getSelectedAppServicePlan().id;
        }

        this._website = await websiteClient.webApps.createOrUpdate(rg.name, this._website.name, this._website);
        
        this.wizard.writeline('Updating Application Settings...');
        let appSettings: WebSiteModels.StringDictionary;
        
        if (this._serverUrl.length > 0) {
            // azure container registry
            appSettings = {
                "id": this._website.id, "name": "appsettings", "location": this._website.location, "type": "Microsoft.Web/sites/config", "properties": {
                    "DOCKER_REGISTRY_SERVER_URL": 'https://' + this._serverUrl, 
                    "DOCKER_REGISTRY_SERVER_USERNAME": this._serverUserName, 
                    "DOCKER_REGISTRY_SERVER_PASSWORD": this._serverPassword,
                    "DOCKER_ENABLE_CI": "true"
                }
            };
        } else {
            // dockerhub - dont set docker_registry_server_url
            appSettings = {
                "id": this._website.id, "name": "appsettings", "location": this._website.location, "type": "Microsoft.Web/sites/config", "properties": {
                    "DOCKER_REGISTRY_SERVER_USERNAME": this._serverUserName, 
                    "DOCKER_REGISTRY_SERVER_PASSWORD": this._serverPassword
                }
            };
            
        }
        
        await websiteClient.webApps.updateApplicationSettings(rg.name, this._website.name, appSettings);
        this._website.siteConfig = await websiteClient.webApps.getConfiguration(rg.name, this._website.name);

        this.wizard.writeline(`Restarting Site...`);
        await websiteClient.webApps.stop(rg.name, this._website.name);
        await websiteClient.webApps.start(rg.name, this._website.name);

        this.wizard.writeline(`Web App "${this._website.name}" ready: https://${this._website.defaultHostName}`);
        this.wizard.writeline('');

    }

    get website(): WebSiteModels.Site {
        return this._website;
    }

    get imageInfo(): { serverUrl: string, serverUser: string, serverPassword: string} {
        return  { 
            serverUrl: this._serverUrl, 
            serverUser: this._serverUserName, 
            serverPassword: this._serverPassword 
        }
    }

}
