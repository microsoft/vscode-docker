/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListNetworkItem } from "@microsoft/container-runtimes";
import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { MarkdownString, ThemeIcon } from "vscode";
import { builtInNetworks } from "../../constants";
import { ext } from "../../extensionVariables";
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { ToolTipTreeItem } from "../ToolTipTreeItem";

export class NetworkTreeItem extends ToolTipTreeItem {
    public static allContextRegExp: RegExp = /Network$/;
    public static customNetworkRegExp: RegExp = /^customNetwork$/i;

    private readonly _item: ListNetworkItem;

    public constructor(parent: AzExtParentTreeItem, itemInfo: ListNetworkItem) {
        super(parent);
        this._item = itemInfo;
    }

    public get contextValue(): string {
        return builtInNetworks.includes(this._item.name) ? 'defaultNetwork' : 'customNetwork';
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get networkId(): string {
        return this._item.id;
    }

    public get createdTime(): number {
        return this._item.createdAt.valueOf();
    }

    public get networkName(): string {
        return this._item.name;
    }

    public get label(): string {
        return ext.networksRoot.getTreeItemLabel(this._item);
    }

    public get description(): string | undefined {
        return ext.networksRoot.getTreeItemDescription(this._item);
    }

    public get iconPath(): ThemeIcon {
        return new ThemeIcon('repo-forked');
    }

    public async deleteTreeItemImpl(context: IActionContext): Promise<void> {
        await ext.defaultShellCR()(
            ext.containerClient.removeNetworks({ networks: [this.networkId] })
        );
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'network';
        return resolveTooltipMarkdown(networkTooltipTemplate, await ext.dockerClient.inspectNetwork(actionContext, this.networkName));
    }
}

const networkTooltipTemplate = `
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
