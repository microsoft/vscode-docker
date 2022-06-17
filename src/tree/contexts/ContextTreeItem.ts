/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectContextsItem, ListContextItem } from "@microsoft/container-runtimes";
import { AzExtParentTreeItem, IActionContext } from "@microsoft/vscode-azext-utils";
import { MarkdownString, ThemeIcon } from "vscode";
import { ext } from "../../extensionVariables";
import { getTreeId } from "../LocalRootTreeItemBase";
import { resolveTooltipMarkdown } from "../resolveTooltipMarkdown";
import { ToolTipTreeItem } from "../ToolTipTreeItem";

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

        if (defaultContextNames.indexOf(this.name) >= 0) {
            result = 'defaultContext;';
        } else if (this.current) {
            result = 'currentCustomContext;';
        } else {
            result = 'customContext;';
        }

        if (this._item.type === 'aci') {
            result += 'aciContext;';
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
        return resolveTooltipMarkdown(contextTooltipTemplate, await this.inspect());
    }
}

// TODO: unlikely this will work
const contextTooltipTemplate = `
### {{ Name }}

---

#### Docker Host Endpoint
{{#if Endpoints.docker.Host}}
{{ Endpoints.docker.Host }}
{{else}}
_{{ Metadata.Type }}_
{{/if}}
`;
