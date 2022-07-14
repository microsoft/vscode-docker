/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListVolumeItem } from "@microsoft/container-runtimes";
import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { MarkdownString, ThemeIcon } from "vscode";
import { ext } from "../../extensionVariables";
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { ToolTipTreeItem } from "../ToolTipTreeItem";

/**
 * This interface defines properties used by the Remote Containers extension. These properties must not be removed from this class.
 */
interface VolumeTreeItemUsedByRemoteContainers {
    readonly volumeName: string;
}

export class VolumeTreeItem extends ToolTipTreeItem implements VolumeTreeItemUsedByRemoteContainers {
    public static contextValue: string = 'volume';
    public contextValue: string = VolumeTreeItem.contextValue;
    private readonly _item: ListVolumeItem;

    public constructor(parent: AzExtParentTreeItem, itemInfo: ListVolumeItem) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.createdAt.valueOf();
    }

    public get volumeName(): string {
        return this._item.name;
    }

    public get label(): string {
        return ext.volumesRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.volumesRoot.getTreeItemDescription(this._item);
    }

    public get iconPath(): ThemeIcon {
        return new ThemeIcon('file-symlink-directory');
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        await ext.runWithDefaultShell(client =>
            client.removeVolumes({ volumes: [this.volumeName] })
        );
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'volume';

        const volumeInspection = (await ext.runWithDefaultShell(client =>
            client.inspectVolumes({ volumes: [this.volumeName] })
        ))?.[0];
        const associatedContainers = await ext.runWithDefaultShell(client =>
            client.listContainers({ volumes: [this.volumeName] })
        );

        const handlebarsContext = {
            ...volumeInspection,
            containers: associatedContainers
        };
        return resolveTooltipMarkdown(volumeTooltipTemplate, handlebarsContext);
    }
}

const volumeTooltipTemplate = `
### {{ name }}

---

#### Associated Containers
{{#if (nonEmptyArr containers)}}
{{#each containers}}
  - {{ this.name }} ({{ substr this.id 0 12 }})
{{/each}}
{{else}}
_None_
{{/if}}
`;
