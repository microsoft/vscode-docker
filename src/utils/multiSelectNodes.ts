/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeDataProvider, AzExtTreeItem, ITreeItemPickerContext, UserCancelledError } from "@microsoft/vscode-azext-utils";

export interface MultiSelectNode {
    readonly canMultiSelect: boolean;
}

/**
 * Helps determine the full list of eligible selected tree item nodes for context menu and commands
 * @param context Tree item context
 * @param tree The tree for which to show an item picker (if no nodes were selected, i.e. it was run as a command, not context menu action)
 * @param expectedContextValue Filters to allow an action only for specific context values
 * @param node The primary selected node (if any)
 * @param nodes All selected nodes. VSCode includes the primary by default, only if multiple were selected.
 */
export async function multiSelectNodes<T extends AzExtTreeItem>(
    context: ITreeItemPickerContext,
    tree: AzExtTreeDataProvider,
    expectedContextValue?: string | RegExp,
    node?: T,
    nodes?: T[]): Promise<T[]> {

    // Ensure it's not undefined
    nodes = nodes || [];

    if (nodes.length === 0 && node) {
        // If there's no multi-selected nodes but primary node is defined, use it as the only element
        nodes = [node];
    }

    if (nodes.length === 0) {
        // If still no selected nodes, need to prompt
        await tree.refresh(context);
        nodes = await tree.showTreeItemPicker<T>(expectedContextValue, { ...context, canPickMany: true });
    } else if (expectedContextValue) {
        // Otherwise if there's a filter, need to filter our selection to exclude ineligible nodes
        // This uses the same logic as AzExtTreeItem.matchesContextValue()
        const beforeLength = nodes.length;
        nodes = nodes.filter(n => {
            return expectedContextValue === n.contextValue || // For strings, exact match comparison
                (expectedContextValue instanceof RegExp && expectedContextValue.test(n.contextValue)); // For regexs, RegExp.test()
        });

        if (beforeLength !== nodes.length) {
            // Some things got filtered off because they were not valid choices
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            context.ui.showWarningMessage('This action is invalid for some selected items. These items will be ignored.');
        }
    }

    // Filter off parent items (i.e. group items), as it doesn't make sense to perform actions on them, when we don't allow actions to be performed on *only* them
    nodes = nodes.filter(n => ((<MultiSelectNode><unknown>n).canMultiSelect === true) || !(n instanceof AzExtParentTreeItem));

    // If we end with no nodes, cancel
    if (nodes.length === 0) {
        throw new UserCancelledError();
    }

    return nodes;
}
