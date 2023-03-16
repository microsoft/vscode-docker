/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { l10n, MarkdownString, ThemeColor, ThemeIcon } from "vscode";
import { ext } from '../../extensionVariables';
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { getCommonPropertyValue } from "../settings/CommonProperties";
import { ToolTipTreeItem } from "../ToolTipTreeItem";
import { DatedDockerImage } from "./ImagesTreeItem";
import { NormalizedImageNameInfo } from "./NormalizedImageNameInfo";

export class ImageTreeItem extends ToolTipTreeItem {
    public static contextValue: string = 'image';
    public contextValue: string = ImageTreeItem.contextValue;
    private readonly _item: DatedDockerImage;
    private readonly _normalizedImageNameInfo: NormalizedImageNameInfo;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DatedDockerImage) {
        super(parent);
        this._item = itemInfo;
        this._normalizedImageNameInfo = new NormalizedImageNameInfo(itemInfo.image);
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get createdTime(): number {
        return this._item.createdAt.valueOf();
    }

    public get imageId(): string {
        return this._item.id;
    }

    public get fullTag(): string {
        return this._normalizedImageNameInfo.fullTag;
    }

    public get label(): string {
        return ext.imagesRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return `${ext.imagesRoot.getTreeItemDescription(this._item)}${this._item.outdated ? l10n.t(' (Out of date)') : ''}`;
    }

    public get iconPath(): ThemeIcon {
        if (this._item.outdated) {
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
        return this._item.size ?? 0;
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        let ref = this.fullTag;

        // Dangling images are shown in the explorer, depending on the setting.
        // In this case, an image ending up with no tag needs to be deleted using the ID.
        if (!this._item.image.image || !this._item.image.tag) {
            ref = this._item.id;
        }

        await ext.runWithDefaults(client =>
            client.removeImages({ imageRefs: [ref], force: true  })
        );
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'image';

        // Allows some parallelization of the two commands
        const imagePromise = ext.runWithDefaults(client =>
            client.inspectImages({ imageRefs: [this.imageId] })
        );
        const containersPromise = ext.runWithDefaults(client =>
            client.listContainers({ imageAncestors: [this.imageId] })
        );

        const imageInspection = (await imagePromise)?.[0];
        const associatedContainers = await containersPromise;

        const handlebarsContext = {
            ...imageInspection,
            normalizedName: this.fullTag,
            normalizedSize: getCommonPropertyValue(this._item, 'Size'),
            containers: associatedContainers
        };
        return resolveTooltipMarkdown(imageTooltipTemplate, handlebarsContext);
    }
}

const imageTooltipTemplate = `
### {{ normalizedName }} ({{ substr id 7 12 }})

---

#### Size
{{ normalizedSize }}

---

#### Associated Containers
{{#if (nonEmptyArr containers)}}
{{#each containers}}
  - {{ this.name }} ({{ substr this.id 0 12 }})
{{/each}}
{{else}}
_None_
{{/if}}

---

#### Exposed Ports
{{#if (nonEmptyArr ports)}}
{{#each ports}}
  - {{ this.containerPort }} {{ this.protocol }}
{{/each}}
{{else}}
_None_
{{/if}}
`;
