/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, IActionContext } from '@microsoft/vscode-azext-utils';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { ListContextItem } from '../../runtimes/docker';
import { descriptionKey, labelKey, LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ITreeSettingWizardInfo } from '../settings/ITreeSettingsWizardContext';
import { TreePrefix } from '../TreePrefix';
import { ContextGroupTreeItem } from './ContextGroupTreeItem';
import { contextProperties, ContextProperty } from "./ContextProperties";
import { ContextTreeItem } from './ContextTreeItem';

export class ContextsTreeItem extends LocalRootTreeItemBase<ListContextItem, ContextProperty> {
    public treePrefix: TreePrefix = 'contexts';
    public label: string = l10n.t('Contexts');
    public configureExplorerTitle: string = l10n.t('Configure Docker Contexts Explorer');
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
                label: l10n.t('Label'),
                setting: labelKey,
                currentValue: this.labelSetting,
                description: l10n.t('The primary property to display.'),
                settingInfo: this.labelSettingInfo
            },
            {
                label: l10n.t('Description'),
                setting: descriptionKey,
                currentValue: this.descriptionSetting,
                description: l10n.t('Any secondary properties to display.'),
                settingInfo: this.descriptionSettingInfo
            }
        ];
    }
}
