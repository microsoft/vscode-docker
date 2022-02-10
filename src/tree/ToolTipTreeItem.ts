/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, IActionContext, callWithTelemetryAndErrorHandling } from '@microsoft/vscode-azext-utils';
import { MarkdownString } from 'vscode';

export abstract class ToolTipTreeItem extends AzExtTreeItem {
    public async resolveTooltip(): Promise<string> {
        if (this.resolveTooltipInternal) {
            try {
                // This lets us cheat TypeScript out of its type-ness by returning a MarkdownString where it expects a string.
                // The reason is that we don't want to rev the required @types/vscode version in @microsoft/vscode-azext-utils to accept
                // MarkdownString there; but we don't actually need to since it's only passing the value through unchanged.
                // TODO: when possible we should remove this
                // @ts-expect-error MarkdownString is not assignable to string
                return await callWithTelemetryAndErrorHandling('resolveTooltip', async (actionContext: IActionContext) => {
                    actionContext.telemetry.suppressIfSuccessful = true;
                    actionContext.errorHandling.suppressDisplay = true;
                    actionContext.errorHandling.rethrow = true;

                    return await this.resolveTooltipInternal(actionContext);
                });
            } catch {
                // Do nothing, fall to the undefined below
            }
        }

        return undefined;
    }

    public abstract resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString>;
}

// Currently this `AzExtParentTreeItem` flavor is used only by `ContainerTreeItem`
export abstract class ToolTipParentTreeItem extends AzExtParentTreeItem {
    public async resolveTooltip(): Promise<string> {
        if (this.resolveTooltipInternal) {
            try {
                // This lets us cheat TypeScript out of its type-ness by returning a MarkdownString where it expects a string.
                // The reason is that we don't want to rev the required @types/vscode version in @microsoft/vscode-azext-utils to accept
                // MarkdownString there; but we don't actually need to since it's only passing the value through unchanged.
                // TODO: when possible we should remove this
                // @ts-expect-error MarkdownString is not assignable to string
                return await callWithTelemetryAndErrorHandling('resolveTooltip', async (actionContext: IActionContext) => {
                    actionContext.telemetry.suppressIfSuccessful = true;
                    actionContext.errorHandling.suppressDisplay = true;
                    actionContext.errorHandling.rethrow = true;

                    return await this.resolveTooltipInternal(actionContext);
                });
            } catch {
                // Do nothing, fall to the undefined below
            }
        }

        return undefined;
    }

    public abstract resolveTooltipInternal(actionContext: IActionContext): Promise<MarkdownString>;
}
