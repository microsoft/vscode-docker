/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { workspace, WorkspaceConfiguration } from 'vscode';
import { AzExtTreeItem } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { dockerContextManager } from "../../utils/dockerContextManager";
import { descriptionKey, labelKey, LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { ITreeSettingWizardInfo } from '../settings/ITreeSettingsWizardContext';
import { ContextGroupTreeItem } from './ContextGroupTreeItem';
import { contextProperties, ContextProperty } from "./ContextProperties";
import { ContextTreeItem } from './ContextTreeItem';
import { LocalContextInfo } from "./LocalContextInfo";

export class ContextsTreeItem extends LocalRootTreeItemBase<LocalContextInfo, ContextProperty> {
    public treePrefix: string = 'contexts';
    public label: string = localize('vscode-docker.tree.Contexts.label', 'Contexts');
    public configureExplorerTitle: string = localize('vscode-docker.tree.Contexts.configure', 'Configure Docker Contexts Explorer');
    public childType: LocalChildType<LocalContextInfo> = ContextTreeItem;
    public childGroupType: LocalChildGroupType<LocalContextInfo, ContextProperty> = ContextGroupTreeItem;

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

    public async getItems(): Promise<LocalContextInfo[]> {
        const contexts = await dockerContextManager.listAll();
        return contexts.map(c => new LocalContextInfo(c));
    }

    public getPropertyValue(item: LocalContextInfo, property: ContextProperty): string {
        switch (property) {
            case 'Name':
                return item.data.Name;
            case 'Description':
                return item.data.Description;
            case 'DockerEndpoint':
                return item.data.DockerEndpoint;
            default:
                return getCommonPropertyValue(item, property);
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
        ]
    }

    protected getRefreshInterval(): number {
        const configOptions: WorkspaceConfiguration = workspace.getConfiguration('docker');
        return configOptions.get<number>('explorerContextsRefreshInterval', 20) * 1000;
    }
}
