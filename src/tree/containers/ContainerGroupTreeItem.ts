/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getThemedIconPath, IconPath } from "../IconPath";
import { getImageGroupIcon } from "../images/ImageProperties";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { ContainerProperty, getContainerStateIcon } from "./ContainerProperties";
import { LocalContainerInfo } from "./LocalContainerInfo";

export class ContainerGroupTreeItem extends LocalGroupTreeItemBase<LocalContainerInfo, ContainerProperty> {
    public static readonly contextValue: string = 'containerGroup';
    public readonly contextValue: string = ContainerGroupTreeItem.contextValue;
    public childTypeLabel: string = 'container';

    public get iconPath(): IconPath {
        let icon: string;
        switch (this.parent.groupBySetting) {
            case 'ContainerId':
            case 'ContainerName':
            case 'Ports':
            case 'Status':
                icon = 'applicationGroup';
                break;
            case 'State':
                return getContainerStateIcon(this.group);
            default:
                return getImageGroupIcon(this.parent.groupBySetting);
        }

        return getThemedIconPath(icon);
    }
}
