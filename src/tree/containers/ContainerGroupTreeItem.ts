/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem } from "vscode-azureextensionui";
import { DockerContainer } from "../../docker/Containers";
import { getThemedIconPath, IconPath } from "../IconPath";
import { getImageGroupIcon } from "../images/ImageProperties";
import { LocalGroupTreeItemBase } from "../LocalGroupTreeItemBase";
import { ContainerProperty, getContainerStateIcon } from "./ContainerProperties";

export class ContainerGroupTreeItem extends LocalGroupTreeItemBase<DockerContainer, ContainerProperty> {
    public static readonly contextValue: string = 'containerGroup';
    public readonly contextValue: string = ContainerGroupTreeItem.contextValue;
    public childTypeLabel: string = 'container';

    public get iconPath(): IconPath {
        let icon: string;
        switch (this.parent.groupBySetting) {
            case 'ContainerId':
            case 'ContainerName':
            case 'Networks':
                icon = 'network';
                break;
            case 'Ports':
            case 'Status':
            case 'Compose Project Name':
                icon = 'applicationGroup';
                break;
            case 'State':
                return getContainerStateIcon(this.group);
            default:
                return getImageGroupIcon(this.parent.groupBySetting);
        }

        return getThemedIconPath(icon);
    }

    public isAncestorOfImpl(expectedContextValue: string | RegExp): boolean {
        return this.ChildTreeItems.some((container: AzExtTreeItem) => this.matchesValue(container, expectedContextValue));
    }

    private matchesValue(container: AzExtTreeItem, expectedContextValue: (string | RegExp)): boolean {
        return container.contextValue === expectedContextValue
            || (expectedContextValue instanceof RegExp && expectedContextValue.test(container.contextValue));
    }
}
