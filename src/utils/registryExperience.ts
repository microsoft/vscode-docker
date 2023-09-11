/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilter, ContextValueFilterQuickPickOptions, GenericQuickPickStep, IActionContext, IAzureQuickPickOptions, IWizardOptions, PickFilter, QuickPickWizardContext, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryItem, isRegistryRoot } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { UnifiedRegistryItem, UnifiedRegistryTreeDataProvider } from '../tree/registries/UnifiedRegistryTreeDataProvider';

export async function registryExperience<TPick>(context: IActionContext, tdp: UnifiedRegistryTreeDataProvider, contextValueFilter: ContextValueFilter, registryFilter: RegistryType[], skipIfOne: boolean = true): Promise<TPick> {
    const promptSteps: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RecursiveQuickPickStep(
            tdp,
            {
                contextValueFilter: contextValueFilter,
                skipIfOne: skipIfOne,

            },
            registryFilter
        )
    ];

    const registryProviders: TPick = await runQuickPickWizard(context, {
        hideStepCount: true,
        promptSteps: promptSteps,
    });

    return registryProviders;
}

export function parseContextValue(contextValue?: string): string[] {
    return contextValue?.split(';') ?? [];
}

export function getLastNode<UnifiedRegistryItem>(context: QuickPickWizardContext): UnifiedRegistryItem | undefined {
    return context.pickedNodes.at(-1) as UnifiedRegistryItem | undefined;
}

export type RegistryType = 'Azure' | 'Docker Hub' | 'Generic Registry V2' | 'GitHub' | 'GitLab';

// This class is copied over from the azure tools repo
// https://github.com/microsoft/vscode-azuretools/blob/main/utils/src/pickTreeItem/contextValue/ContextValueQuickPickStep.ts#L16
export class RegistryQuickPickStep<TContext extends QuickPickWizardContext, TOptions extends ContextValueFilterQuickPickOptions> extends GenericQuickPickStep<TContext, TOptions> {
    public constructor(
        protected readonly treeDataProvider: UnifiedRegistryTreeDataProvider,
        protected readonly pickOptions: TOptions,
        protected readonly registryFilter: RegistryType[],
        protected readonly promptOptions?: IAzureQuickPickOptions,
    ) {
        super(treeDataProvider, pickOptions, promptOptions);
        this.promptOptions = {
            noPicksMessage: vscode.l10n.t('No matching resources found.'),
            ...promptOptions,
        };
    }
    protected readonly pickFilter: PickFilter = new RegistryPickFilter(this.pickOptions, this.registryFilter);
}

export class RegistryPickFilter implements PickFilter {
    constructor(
        protected readonly pickOptions: ContextValueFilterQuickPickOptions,
        protected readonly registryFilter: RegistryType[],
    ) { }

    isFinalPick(node: CommonRegistryItem): boolean {
        const includeOption = this.pickOptions.contextValueFilter.include;
        const excludeOption = this.pickOptions.contextValueFilter.exclude;

        const includeArray: (string | RegExp)[] = Array.isArray(includeOption) ? includeOption : [includeOption];
        const excludeArray: (string | RegExp)[] = excludeOption ?
            (Array.isArray(excludeOption) ? excludeOption : [excludeOption]) :
            [];

        const nodeContextValues: string[] = parseContextValue(node.contextValue);

        return includeArray.some(i => this.matchesSingleFilter(i, nodeContextValues)) &&
            !excludeArray.some(e => this.matchesSingleFilter(e, nodeContextValues));
    }

    isAncestorPick(treeItem: CommonRegistryItem, element: unknown): boolean {
        // Check if the tree item is the first step and if you want to skip it
        if (!isRegistryRoot(treeItem)) {
            return !!treeItem.collapsibleState;
        }

        if (isRegistryRoot(treeItem) && this.registryFilter.includes(treeItem.label as RegistryType)) {
            return !!treeItem.collapsibleState;
        }

        return false;
    }

    private matchesSingleFilter(matcher: string | RegExp, nodeContextValues: string[]): boolean {
        return nodeContextValues.some(c => {
            if (matcher instanceof RegExp) {
                return matcher.test(c);
            }

            // Context value matcher is a string, do full equality (same as old behavior)
            return c === matcher;
        });
    }
}

export class RecursiveQuickPickStep<TContext extends QuickPickWizardContext> extends RegistryQuickPickStep<TContext, ContextValueFilterQuickPickOptions> {
    hideStepCount: boolean = true;

    public async getSubWizard(wizardContext: TContext): Promise<IWizardOptions<TContext> | undefined> {
        const lastPickedItem = getLastNode(wizardContext);

        if (!lastPickedItem) {
            // Something went wrong, no node was chosen
            throw new Error('No node was set after prompt step.');
        }

        if (this.pickFilter.isFinalPick(await this.treeDataProvider.getTreeItem(lastPickedItem as UnifiedRegistryItem<unknown>), lastPickedItem)) {
            // The last picked node matches the expected filter
            // No need to continue prompting
            return undefined;
        } else {
            // Need to keep going because the last picked node is not a match
            return {
                promptSteps: [
                    new RecursiveQuickPickStep(this.treeDataProvider, this.pickOptions, this.registryFilter, this.promptOptions)
                ],
            };
        }
    }
}
