/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IconPath } from "../IconPath";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { getTreeSetting } from "../settings/commonTreeSettings";
import { ContainersGroupBy, getContainerGroupIcon } from "./containersTreeSettings";
import { LocalContainerInfo } from "./LocalContainerInfo";

export class ContainerGroupTreeItem extends LocalGroupTreeItemBase<LocalContainerInfo> {
    public static readonly contextValue: string = 'containerGroup';
    public readonly contextValue: string = ContainerGroupTreeItem.contextValue;
    public childTypeLabel: string = 'container';

    public get iconPath(): IconPath {
        let groupBy = getTreeSetting(ContainersGroupBy);
        return getContainerGroupIcon(groupBy, this.group);
    }
}
