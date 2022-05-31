/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { MarkdownString, ThemeIcon } from "vscode";
import { DockerVolume } from "../../docker/Volumes";
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
    private readonly _item: DockerVolume;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DockerVolume) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.CreatedTime;
    }

    public get volumeName(): string {
        return this._item.Name;
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
        return ext.dockerClient.removeVolume(context, this.volumeName);
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'volume';
        return resolveTooltipMarkdown(volumeTooltipTemplate, await ext.dockerClient.inspectVolume(actionContext, this.volumeName));
    }
}

const volumeTooltipTemplate = `
### {{ Name }}

---

#### Associated Containers
{{#if (nonEmptyObj Containers)}}
{{#each Containers}}
  - {{ this.Name }} ({{ substr @key 0 12 }})
{{/each}}
{{else}}
_None_
{{/if}}
`;
