/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { dockerContextManager } from "../../utils/dockerContextManager";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { contextProperties, ContextProperty } from "./ContextProperties";
import { ContextGroupTreeItem, ContextTreeItem } from './ContextTreeItem';
import { LocalContextInfo } from "./LocalContextInfo";

export class ContextsTreeItem extends LocalRootTreeItemBase<LocalContextInfo, ContextProperty> {
    public treePrefix: string = 'Contexts';
    public label: string = localize('vscode-docker.tree.Contexts.label', 'Contexts');
    public configureExplorerTitle: string = localize('vscode-docker.tree.Contexts.configure', 'Configure Contexts explorer');
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
}
