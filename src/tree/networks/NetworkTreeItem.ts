/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { MarkdownString, ThemeIcon } from "vscode";
import { builtInNetworks } from "../../constants";
import { DockerNetwork } from "../../docker/Networks";
import { ext } from "../../extensionVariables";
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { ToolTipTreeItem } from "../ToolTipTreeItem";

export class NetworkTreeItem extends ToolTipTreeItem {
    public static allContextRegExp: RegExp = /Network$/;
    public static customNetworkRegExp: RegExp = /^customNetwork$/i;

    private readonly _item: DockerNetwork;

    public constructor(parent: AzExtParentTreeItem, itemInfo: DockerNetwork) {
        super(parent);
        this._item = itemInfo;
    }

    public get contextValue(): string {
        return builtInNetworks.includes(this._item.Name) ? 'defaultNetwork' : 'customNetwork';
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get networkId(): string {
        return this._item.Id;
    }

    public get createdTime(): number {
        return this._item.CreatedTime;
    }

    public get networkName(): string {
        return this._item.Name;
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
        return ext.dockerClient.removeNetwork(context, this.networkId);
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
