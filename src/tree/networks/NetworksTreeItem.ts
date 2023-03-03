/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n, workspace } from "vscode";
import { builtInNetworks, configPrefix } from "../../constants";
import { ext } from "../../extensionVariables";
import { ListNetworkItem } from "../../runtimes/docker";
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { TreePrefix } from "../TreePrefix";
import { NetworkGroupTreeItem } from "./NetworkGroupTreeItem";
import { networkProperties, NetworkProperty } from "./NetworkProperties";
import { NetworkTreeItem } from "./NetworkTreeItem";

export class NetworksTreeItem extends LocalRootTreeItemBase<ListNetworkItem, NetworkProperty> {
    public treePrefix: TreePrefix = 'networks';
    public label: string = l10n.t('Networks');
    public configureExplorerTitle: string = l10n.t('Configure networks explorer');
    public childType: LocalChildType<ListNetworkItem> = NetworkTreeItem;
    public childGroupType: LocalChildGroupType<ListNetworkItem, NetworkProperty> = NetworkGroupTreeItem;

    public labelSettingInfo: ITreeSettingInfo<NetworkProperty> = {
        properties: networkProperties,
        defaultProperty: 'NetworkName',
    };

    public descriptionSettingInfo: ITreeArraySettingInfo<NetworkProperty> = {
        properties: networkProperties,
        defaultProperty: ['NetworkDriver', 'CreatedTime'],
    };

    public groupBySettingInfo: ITreeSettingInfo<NetworkProperty | CommonGroupBy> = {
        properties: [...networkProperties, groupByNoneProperty],
        defaultProperty: 'None',
    };

    public get childTypeLabel(): string {
        return this.groupBySetting === 'None' ? 'network' : 'network group';
    }

    public async getItems(context: IActionContext): Promise<ListNetworkItem[]> {
        const config = workspace.getConfiguration(configPrefix);
        const showBuiltInNetworks: boolean = config.get<boolean>('networks.showBuiltInNetworks');

        let networks = await ext.runWithDefaults(client =>
            client.listNetworks({})
        ) || [];

        if (!showBuiltInNetworks) {
            networks = networks.filter(network => !builtInNetworks.includes(network.name));
        }

        return networks;
    }

    public getPropertyValue(item: ListNetworkItem, property: NetworkProperty): string {
        switch (property) {
            case 'NetworkDriver':
                return item.driver;
            case 'NetworkId':
                return item.id.slice(0, 12);
            case 'NetworkName':
                return item.name;
            default:
                return getCommonPropertyValue(item, property);
        }
    }
}
