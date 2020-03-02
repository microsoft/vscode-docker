/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { NetworkInspectInfo } from "dockerode";
import { workspace } from "vscode";
import { builtInNetworks, configPrefix } from "../../constants";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { LocalNetworkInfo } from "./LocalNetworkInfo";
import { NetworkGroupTreeItem } from "./NetworkGroupTreeItem";
import { networkProperties, NetworkProperty } from "./NetworkProperties";
import { NetworkTreeItem } from "./NetworkTreeItem";

export class NetworksTreeItem extends LocalRootTreeItemBase<LocalNetworkInfo, NetworkProperty> {
    public treePrefix: string = 'networks';
    public label: string = localize('vscode-docker.tree.networks.label', 'Networks');
    public configureExplorerTitle: string = localize('vscode-docker.tree.networks.configure', 'Configure networks explorer');
    public childType: LocalChildType<LocalNetworkInfo> = NetworkTreeItem;
    public childGroupType: LocalChildGroupType<LocalNetworkInfo, NetworkProperty> = NetworkGroupTreeItem;

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

    public async getItems(): Promise<LocalNetworkInfo[]> {
        let config = workspace.getConfiguration(configPrefix);
        let showBuiltInNetworks: boolean = config.get<boolean>('networks.showBuiltInNetworks');

        let networks = <NetworkInspectInfo[]>await ext.dockerode.listNetworks() || [];

        if (!showBuiltInNetworks) {
            networks = networks.filter(network => !builtInNetworks.includes(network.Name));
        }

        return networks.map(n => new LocalNetworkInfo(n));
    }

    public getPropertyValue(item: LocalNetworkInfo, property: NetworkProperty): string {
        switch (property) {
            case 'NetworkDriver':
                return item.networkDriver;
            case 'NetworkId':
                return item.networkId.slice(0, 12);
            case 'NetworkName':
                return item.networkName;
            default:
                return getCommonPropertyValue(item, property);
        }
    }
}
