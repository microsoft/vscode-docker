/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { workspace } from "vscode";
import { builtInNetworks, configPrefix } from "../../constants";
import { DockerNetwork } from "../../docker/Networks";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { LocalChildGroupType, LocalChildType, LocalRootTreeItemBase } from "../LocalRootTreeItemBase";
import { CommonGroupBy, getCommonPropertyValue, groupByNoneProperty } from "../settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "../settings/ITreeSettingInfo";
import { NetworkGroupTreeItem } from "./NetworkGroupTreeItem";
import { NetworkProperty, networkProperties } from "./NetworkProperties";
import { NetworkTreeItem } from "./NetworkTreeItem";

export class NetworksTreeItem extends LocalRootTreeItemBase<DockerNetwork, NetworkProperty> {
    public treePrefix: string = 'networks';
    public label: string = localize('vscode-docker.tree.networks.label', 'Networks');
    public configureExplorerTitle: string = localize('vscode-docker.tree.networks.configure', 'Configure networks explorer');
    public childType: LocalChildType<DockerNetwork> = NetworkTreeItem;
    public childGroupType: LocalChildGroupType<DockerNetwork, NetworkProperty> = NetworkGroupTreeItem;

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

    public async getItems(context: IActionContext): Promise<DockerNetwork[]> {
        const config = workspace.getConfiguration(configPrefix);
        const showBuiltInNetworks: boolean = config.get<boolean>('networks.showBuiltInNetworks');

        let networks = await ext.dockerClient.getNetworks(context) || [];

        if (!showBuiltInNetworks) {
            networks = networks.filter(network => !builtInNetworks.includes(network.Name));
        }

        return networks;
    }

    public getPropertyValue(item: DockerNetwork, property: NetworkProperty): string {
        switch (property) {
            case 'NetworkDriver':
                return item.Driver;
            case 'NetworkId':
                return item.Id.slice(0, 12);
            case 'NetworkName':
                return item.Name;
            default:
                return getCommonPropertyValue(item, property);
        }
    }
}
