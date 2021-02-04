/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ThemeIcon } from "vscode";
import { DockerNetwork } from "../../docker/Networks";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { getCommonGroupIcon } from "../settings/CommonProperties";
import { NetworkProperty } from "./NetworkProperties";

export class NetworkGroupTreeItem extends LocalGroupTreeItemBase<DockerNetwork, NetworkProperty> {
    public static readonly contextValue: string = 'networkGroup';
    public readonly contextValue: string = NetworkGroupTreeItem.contextValue;
    public childTypeLabel: string = 'network';

    public get iconPath(): ThemeIcon {
        switch (this.parent.groupBySetting) {
            case 'NetworkDriver':
            case 'NetworkId':
            case 'NetworkName':
                return new ThemeIcon('repo-forked');
            default:
                return getCommonGroupIcon(this.parent.groupBySetting);
        }
    }
}
