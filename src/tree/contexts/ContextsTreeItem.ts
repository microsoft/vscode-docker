/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListContextItem } from '../../runtimes/docker';
import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase, descriptionKey, labelKey } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ITreeSettingWizardInfo } from '../settings/ITreeSettingsWizardContext';
import { ContextGroupTreeItem } from './ContextGroupTreeItem';
import { ContextProperty, contextProperties } from "./ContextProperties";
import { ContextTreeItem } from './ContextTreeItem';

export class ContextsTreeItem extends LocalRootTreeItemBase<ListContextItem, ContextProperty> {
    public treePrefix: string = 'contexts';
    public label: string = localize('vscode-docker.tree.Contexts.label', 'Contexts');
    public configureExplorerTitle: string = localize('vscode-docker.tree.Contexts.configure', 'Configure Docker Contexts Explorer');
    public childType: LocalChildType<ListContextItem> = ContextTreeItem;
    public childGroupType: LocalChildGroupType<ListContextItem, ContextProperty> = ContextGroupTreeItem;

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

    public async getItems(actionContext: IActionContext): Promise<ListContextItem[]> {
        return ext.runtimeManager.contextManager.getContexts();
    }

    public getPropertyValue(item: ListContextItem, property: ContextProperty): string {
        switch (property) {
            case 'Name':
                return item.name;
            case 'Description':
                return item.description ?? '';
            case 'DockerEndpoint':
                return item.containerEndpoint ?? '';
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
}
