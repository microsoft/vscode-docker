/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, AzureWizard, AzureWizardExecuteStep, AzureWizardPromptStep, IActionContext, ICreateChildImplContext } from '@microsoft/vscode-azext-utils';
import { DockerContext } from '../../docker/Contexts';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { getAzActTreeItem, getAzExtAzureUtils } from '../../utils/lazyPackages';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase, descriptionKey, labelKey } from "../LocalRootTreeItemBase";
import { RegistryApi } from '../registries/all/RegistryApi';
import { azureRegistryProviderId } from '../registries/azure/azureRegistryProvider';
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ITreeSettingWizardInfo } from '../settings/ITreeSettingsWizardContext';
import { AciContextCreateStep } from './aci/AciContextCreateStep';
import { ContextNameStep } from './aci/ContextNameStep';
import { IAciWizardContext } from './aci/IAciWizardContext';
import { ContextGroupTreeItem } from './ContextGroupTreeItem';
import { ContextProperty, contextProperties } from "./ContextProperties";
import { ContextTreeItem } from './ContextTreeItem';

export class ContextsTreeItem extends LocalRootTreeItemBase<DockerContext, ContextProperty> {
    public treePrefix: string = 'contexts';
    public label: string = localize('vscode-docker.tree.Contexts.label', 'Contexts');
    public configureExplorerTitle: string = localize('vscode-docker.tree.Contexts.configure', 'Configure Docker Contexts Explorer');
    public childType: LocalChildType<DockerContext> = ContextTreeItem;
    public childGroupType: LocalChildGroupType<DockerContext, ContextProperty> = ContextGroupTreeItem;
    public createNewLabel: string = localize('vscode-docker.tree.Contexts.createNewLabel', 'Create new ACI context...');

    public labelSettingInfo: ITreeSettingInfo<ContextProperty> = {
        properties: contextProperties,
        defaultProperty: 'Name',
    };

    public descriptionSettingInfo: ITreeArraySettingInfo<ContextProperty> = {
        properties: contextProperties,
        defaultProperty: ['Description'],
    };

    public groupBySettingInfo: ITreeSettingInfo<ContextProperty | CommonGroupBy> = {
        properties: [groupByNoneProperty],
        defaultProperty: 'None',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'context' : 'context group';
    }

    public async getItems(context: IActionContext): Promise<DockerContext[]> {
        return ext.dockerContextManager.getContexts();
    }

    public getPropertyValue(item: DockerContext, property: ContextProperty): string {
        switch (property) {
            case 'Name':
                return item.Name;
            case 'Description':
                return item.Description;
            case 'DockerEndpoint':
                return item.DockerEndpoint;
            default:
                // No other properties exist for DockerContext but all case statements must have a default
                // So return empty string
                return '';
        }
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        return ti1.label.localeCompare(ti2.label);
    }

    public getSettingWizardInfoList(): ITreeSettingWizardInfo[] {
        return [
            {
                label: localize('vscode-docker.tree.contextConfig.label.label', 'Label'),
                setting: labelKey,
                currentValue: this.labelSetting,
                description: localize('vscode-docker.tree.contextConfig.label.description', 'The primary property to display.'),
                settingInfo: this.labelSettingInfo
            },
            {
                label: localize('vscode-docker.tree.contextConfig.description.label', 'Description'),
                setting: descriptionKey,
                currentValue: this.descriptionSetting,
                description: localize('vscode-docker.tree.contextConfig.description.description', 'Any secondary properties to display.'),
                settingInfo: this.descriptionSettingInfo
            }
        ];
    }

    public async createChildImpl(actionContext: ICreateChildImplContext): Promise<ContextTreeItem> {
        const wizardContext: IActionContext & Partial<IAciWizardContext> = {
            ...actionContext,
        };

        const azExtAzureUtils = await getAzExtAzureUtils();

        // Set up the prompt steps
        const promptSteps: AzureWizardPromptStep<IAciWizardContext>[] = [
            new ContextNameStep(),
        ];

        const azActTreeItem = await getAzActTreeItem();

        // Create a temporary azure account tree item since Azure might not be connected
        const azureAccountTreeItem = new azActTreeItem.AzureAccountTreeItem(ext.registriesRoot, { id: azureRegistryProviderId, api: RegistryApi.DockerV2 });

        // Add a subscription prompt step (skipped if there is exactly one subscription)
        const subscriptionStep = await azureAccountTreeItem.getSubscriptionPromptStep(wizardContext);
        if (subscriptionStep) {
            promptSteps.push(subscriptionStep);
        }

        // Add additional prompt steps
        promptSteps.push(new azExtAzureUtils.ResourceGroupListStep());

        // Set up the execute steps
        const executeSteps: AzureWizardExecuteStep<IAciWizardContext>[] = [
            new AciContextCreateStep(),
        ];

        const title = localize('vscode-docker.commands.contexts.create.aci.title', 'Create new Azure Container Instances context');

        const wizard = new AzureWizard(wizardContext, { title, promptSteps, executeSteps });
        await wizard.prompt();
        await wizard.execute();

        return new ContextTreeItem(this, {
            Id: wizardContext.contextName,
            Name: wizardContext.contextName,
            Current: false,
            DockerEndpoint: undefined,
            CreatedTime: undefined,
            ContextType: 'aci',
        });
    }
}
