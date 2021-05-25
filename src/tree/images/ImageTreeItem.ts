/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MarkdownString, ThemeColor, ThemeIcon } from "vscode";
import { AzExtParentTreeItem, IActionContext } from "vscode-azureextensionui";
import { ext } from '../../extensionVariables';
import { localize } from "../../localize";
import { AzExtTreeItemIntermediate } from "../AzExtTreeItemIntermediate";
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { getCommonPropertyValue } from "../settings/CommonProperties";
import { DatedDockerImage } from "./ImagesTreeItem";

export class ImageTreeItem extends AzExtTreeItemIntermediate {
    public static contextValue: string = 'image';
    public contextValue: string = ImageTreeItem.contextValue;
    private readonly _item: DatedDockerImage;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DatedDockerImage) {
        super(parent);
        this._item = itemInfo;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.CreatedTime;
    }

    public get imageId(): string {
        return this._item.Id;
    }

    public get fullTag(): string {
        return this._item.Name;
    }

    public get label(): string {
        return ext.imagesRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return `${ext.imagesRoot.getTreeItemDescription(this._item)}${this._item.Outdated ? localize('vscode-docker.tree.images.outdated', ' (Out of date)') : ''}`;
    }

    public get iconPath(): ThemeIcon {
        if (this._item.Outdated) {
            return new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground'));
        }

        switch (ext.imagesRoot.labelSetting) {
            case 'Tag':
                return new ThemeIcon('bookmark');
            default:
                return new ThemeIcon('window');
        }
    }

    public get size(): number {
        return this._item.Size ?? 0;
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        let ref = this.fullTag;

        // Dangling images are not shown in the explorer. However, an image can end up with <none> tag, if a new version of that particular tag is pulled.
        if (ref.endsWith(':<none>') && this._item.RepoDigests?.length) {
            // Image is tagged <none>. Need to delete by digest.
            ref = this._item.RepoDigests[0];

            if (ref.endsWith('@<none>')) {
                // Digest is tagged <none>. Need to delete by ID.
                ref = this._item.Id;
            }
        }

        return ext.dockerClient.removeImage(context, ref);
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'image';
        return resolveTooltipMarkdown(imageTooltipTemplate, { NormalizedName: this.fullTag, NormalizedSize: getCommonPropertyValue(this._item, 'Size'), ...await ext.dockerClient.inspectImage(actionContext, this.imageId) });
    }
}

const imageTooltipTemplate = `
### {{ NormalizedName }} ({{ substr Id 7 12 }})

---

#### Size
{{ NormalizedSize }}

---

#### Associated Containers
{{#if (nonEmptyObj Containers)}}
{{#each Containers}}
  - {{ this.Name }} ({{ substr @key 0 12 }})
{{/each}}
{{else}}
_None_
{{/if}}

---

#### Exposed Ports
{{#if (nonEmptyObj Config.ExposedPorts)}}
{{#each Config.ExposedPorts}}
  - {{ @key }}
{{/each}}
{{else}}
_None_
{{/if}}
`;
