/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectContextsItem, ListContextItem } from "../../runtimes/docker";
import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { MarkdownString, ThemeIcon } from "vscode";
import { ext } from "../../extensionVariables";
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { ToolTipTreeItem } from "../ToolTipTreeItem";

const DefaultContextNames = ['default', 'desktop-windows', 'desktop-linux'];

export class ContextTreeItem extends ToolTipTreeItem {
    public static allContextRegExp: RegExp = /Context;/;
    public static removableContextRegExp: RegExp = /^customContext;/i;

    private readonly _item: ListContextItem;

    public constructor(parent: AzExtParentTreeItem, item: ListContextItem) {
        super(parent);
        this._item = item;
    }

    public get contextValue(): string {
        let result: string;

        if (DefaultContextNames.indexOf(this.name) >= 0) {
            result = 'defaultContext;';
        } else if (this.current) {
            result = 'currentCustomContext;';
        } else {
            result = 'customContext;';
        }

        return result;
    }

    public get createdTime(): number {
        return undefined;
    }

    public get id(): string {
        return getTreeId(this._item);
    }

    public get label(): string {
        return ext.contextsRoot.getTreeItemLabel(this._item);
    }

    // this is the description shown in tree item which can include one or more properites combined.
    // This is not the description of the context.
    public get description(): string | undefined {
        return ext.contextsRoot.getTreeItemDescription(this._item);
    }

    public get name(): string {
        return this._item.name;
    }

    public get current(): boolean {
        return this._item.current;
    }

    public get iconPath(): ThemeIcon | undefined {
        if (this._item.current) {
            return new ThemeIcon('plug');
        }

        return undefined;
    }

    public async deleteTreeItemImpl(): Promise<void> {
        return ext.runtimeManager.contextManager.removeContext(this.name);
    }

    public async inspect(): Promise<InspectContextsItem> {
        return ext.runtimeManager.contextManager.inspectContext(this.name);
    }

    public async use(): Promise<void> {
        return ext.runtimeManager.contextManager.useContext(this.name);
    }

    public async resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString> {
        actionContext.telemetry.properties.tooltipType = 'context';
        const contextInspection = await this.inspect();
        const handlebarsContext = {
            ...contextInspection,
            containerEndpoint: this._item.containerEndpoint
        };
        return resolveTooltipMarkdown(contextTooltipTemplate, handlebarsContext);
    }
}

const contextTooltipTemplate = `
### {{ name }}

---

#### Docker Host Endpoint
{{#if containerEndpoint}}
{{ containerEndpoint }}
{{else}}
_{{ type }}_
{{/if}}
`;
