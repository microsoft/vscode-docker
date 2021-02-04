/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { MarkdownString, ThemeIcon } from 'vscode';
import { AzExtParentTreeItem, callWithTelemetryAndErrorHandling, IActionContext } from 'vscode-azureextensionui';

/**
 * The purpose of this class is to be an intermediate abstract class that redefines these properties from the parent as abstract.
 * This allows inheriting classes to implement them as either properties or accessors
 */
export abstract class AzExtParentTreeItemIntermediate extends AzExtParentTreeItem {
    public abstract readonly id?: string;
    public abstract readonly iconPath?: ThemeIcon;
    public abstract readonly description?: string;

    public async resolveTooltip(): Promise<string> {
        if (this.resolveTooltipInternal) {
            try {
                // This lets us cheat TypeScript out of its type-ness by returning a MarkdownString where it expects a string.
                // The reason is that we don't want to rev the required @types/vscode version in vscode-azureextensionui to accept
                // MarkdownString there; but we don't actually need to since it's only passing the value through unchanged.
                // TODO: when possible we should remove this
                // @ts-expect-error
                return await callWithTelemetryAndErrorHandling('resolveTooltip', async (actionContext: IActionContext) => {
                    actionContext.telemetry.suppressIfSuccessful = true;
                    actionContext.errorHandling.suppressDisplay = true;
                    actionContext.errorHandling.rethrow = true;

                    return await this.resolveTooltipInternal(actionContext);
                });
            } catch { } // Do nothing, fall to the undefined below
        }

        return undefined;
    }

    public abstract resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString>;
}
