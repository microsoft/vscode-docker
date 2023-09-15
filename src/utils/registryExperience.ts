/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilterQuickPickOptions, GenericQuickPickStep, IActionContext, IAzureQuickPickItem, PickFilter, QuickPickWizardContext, RecursiveQuickPickStep, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryItem, isRegistryRoot } from '@microsoft/vscode-docker-registries';
import { TreeItem, TreeItemLabel } from 'vscode';
import { UnifiedRegistryItem, UnifiedRegistryTreeDataProvider } from '../tree/registries/UnifiedRegistryTreeDataProvider';

export interface RegistryFilter {
    /**
     * This filter will exclude registry labels that you don't want to show in the quick pick.
     */
    exclude?: string[];
}

export interface RegistryExperienceOptions extends ContextValueFilterQuickPickOptions {
    // if registryFilter is undefined, all registries will be shown in the quick pick
    registryFilter?: RegistryFilter;
}

export async function registryExperience(context: IActionContext, tdp: UnifiedRegistryTreeDataProvider, options: RegistryExperienceOptions): Promise<UnifiedRegistryItem<CommonRegistryItem>> {
    // get the registry provider unified item
    const registryProviderStep: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RegistryQuickPickStep(
            tdp,
            { ...options, skipIfOne: true }
        ),
        new RecursiveQuickPickStep(
            tdp,
            options
        )
    ];

    const unifiedRegistryItem = await runQuickPickWizard(context, {
        hideStepCount: true,
        promptSteps: registryProviderStep,
    });

    return unifiedRegistryItem as UnifiedRegistryItem<CommonRegistryItem>;
}

export class RegistryQuickPickStep extends GenericQuickPickStep<QuickPickWizardContext, RegistryExperienceOptions> {
    protected readonly pickFilter: PickFilter = new RegistryPickFilter(this.pickOptions);

    public constructor(
        protected readonly treeDataProvider: UnifiedRegistryTreeDataProvider,
        protected readonly pickOptions: RegistryExperienceOptions,
    ) {
        super(treeDataProvider, pickOptions);
    }

    protected async getPicks(wizardContext: QuickPickWizardContext): Promise<IAzureQuickPickItem<UnifiedRegistryItem<unknown>>[]> {
        const lastPickedItem: UnifiedRegistryItem<unknown> | undefined = getLastNode(wizardContext);

        // get all connected registry providers
        let childElements = ((await this.treeDataProvider.getChildren(lastPickedItem)) || []) as UnifiedRegistryItem<unknown>[];
        // only filter down choices when a registry filter is given and the items for registry roots
        if (this.pickOptions.registryFilter && isRegistryRoot(childElements?.[0]?.wrappedItem)) {
            // Filter out elements based on the given arrays of labels
            childElements = childElements.filter((element) => {
                const label = (element.wrappedItem as CommonRegistryItem).label;
                return !this.pickOptions.registryFilter.exclude.includes(label);
            });
        }

        const childItems = await Promise.all(childElements.map(async childElement => await this.treeDataProvider.getTreeItem(childElement)));
        const childPairs: [UnifiedRegistryItem<unknown>, TreeItem][] = childElements.map((childElement, i: number) => [childElement, childItems[i]]);

        const picks: IAzureQuickPickItem<UnifiedRegistryItem<unknown>>[] = [];
        for (const pairs of childPairs) {
            picks.push(await this.getQuickPickItem(...pairs));
        }

        return picks;
    }

    protected async getQuickPickItem(element: UnifiedRegistryItem<unknown>, item: TreeItem): Promise<IAzureQuickPickItem<UnifiedRegistryItem<unknown>>> {
        return {
            label: ((item.label as TreeItemLabel)?.label || item.label) as string,
            description: item.description as string,
            data: element,
        };
    }
}

export class RegistryPickFilter implements PickFilter {
    constructor(protected readonly pickOptions: ContextValueFilterQuickPickOptions) { }

    isFinalPick(node: TreeItem): boolean {
        const includeOption = this.pickOptions.contextValueFilter.include;
        const excludeOption = this.pickOptions.contextValueFilter.exclude;

        const includeArray: (string | RegExp)[] = Array.isArray(includeOption) ? includeOption : [includeOption];
        const excludeArray: (string | RegExp)[] = excludeOption ?
            (Array.isArray(excludeOption) ? excludeOption : [excludeOption]) :
            [];


        return includeArray.some(i => this.matchesFilter(i, node.contextValue)) &&
            !excludeArray.some(e => this.matchesFilter(e, node.contextValue));
    }

    isAncestorPick(treeItem: TreeItem, element: unknown): boolean {
        // `TreeItemCollapsibleState.None` and `undefined` are both falsy, and indicate that a `TreeItem` cannot have children--and therefore, cannot be an ancestor pick
        return !!treeItem.collapsibleState;
    }

    private matchesFilter(matcher: string | RegExp, nodeContextValue: string): boolean {
        if (matcher instanceof RegExp) {
            return matcher.test(nodeContextValue);
        }

        // Context value matcher is a string, do full equality (same as old behavior)
        return nodeContextValue === matcher;
    }
}

export function getLastNode<TNode = UnifiedRegistryItem<unknown>>(context: QuickPickWizardContext): TNode | undefined {
    return context.pickedNodes.at(-1) as TNode | undefined;
}


