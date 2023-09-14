/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilterQuickPickOptions, GenericQuickPickStep, IActionContext, IAzureQuickPickItem, QuickPickWizardContext, RecursiveQuickPickStep, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryRoot, RegistryItem } from '@microsoft/vscode-docker-registries';
import { TreeItem, TreeItemLabel, l10n } from 'vscode';
import { UnifiedRegistryItem, UnifiedRegistryTreeDataProvider } from '../tree/registries/UnifiedRegistryTreeDataProvider';

export interface RegistryFilter {
    /**
     * This filter will exclude registry labels that you don't want to show in the quick pick.
     */
    exclude?: string[];
}

export interface RegistryExperienceOptions extends ContextValueFilterQuickPickOptions {
    // if registryFilter is not provided, all registries will be shown in the quick pick
    registryFilter?: RegistryFilter;
}

export async function registryExperience<TPick>(context: IActionContext, tdp: UnifiedRegistryTreeDataProvider, options: RegistryExperienceOptions): Promise<TPick> {
    const registryProviderStep: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RegistryQuickPickStep(
            tdp,
            options
        )
    ];

    const unifiedRegistryItem = await runQuickPickWizard(context, {
        hideStepCount: true,
        promptSteps: registryProviderStep,
    });

    if (!unifiedRegistryItem) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(l10n.t('No registries found'));
    }

    const promptSteps: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RecursiveQuickPickStep(
            (unifiedRegistryItem as UnifiedRegistryItem<RegistryItem>).provider,
            {
                contextValueFilter: options.contextValueFilter,
                skipIfOne: true,
            }
        )
    ];

    const pickWithoutProvider = await runQuickPickWizard(context, {
        hideStepCount: true,
        promptSteps: promptSteps,
    });

    const pickWithProvider: UnifiedRegistryItem<RegistryItem> = {
        wrappedItem: pickWithoutProvider,
        provider: (unifiedRegistryItem as UnifiedRegistryItem<RegistryItem>).provider,
        parent: undefined, // TODO: figure out how to get the parent
    };

    return pickWithProvider as unknown as TPick;
}

export class RegistryQuickPickStep extends GenericQuickPickStep<QuickPickWizardContext, RegistryExperienceOptions> {
    public constructor(
        protected readonly treeDataProvider: UnifiedRegistryTreeDataProvider,
        protected readonly pickOptions: RegistryExperienceOptions,
    ) {
        super(treeDataProvider, { ...pickOptions, skipIfOne: true });
    }

    protected async getPicks(wizardContext: QuickPickWizardContext): Promise<IAzureQuickPickItem<UnifiedRegistryItem<CommonRegistryRoot>>[]> {
        // get all connected registry providers
        let childElements = ((await this.treeDataProvider.getChildren()) || []) as UnifiedRegistryItem<CommonRegistryRoot>[];
        if (this.pickOptions.registryFilter) {
            // Filter out elements based on the given arrays of labels
            childElements = childElements.filter((element) => {
                const label = element.wrappedItem.label;
                return !this.pickOptions.registryFilter.exclude.includes(label);
            });
        }

        const childItems = await Promise.all(childElements.map(async childElement => await this.treeDataProvider.getTreeItem(childElement)));
        const childPairs: [UnifiedRegistryItem<CommonRegistryRoot>, TreeItem][] = childElements.map((childElement, i: number) => [childElement, childItems[i]]);

        const picks: IAzureQuickPickItem<UnifiedRegistryItem<CommonRegistryRoot>>[] = [];
        for (const pairs of childPairs) {
            picks.push(await this.getQuickPickItem(...pairs));
        }

        return picks;
    }

    // copied from GenericQuickPickStep
    protected async getQuickPickItem(element: UnifiedRegistryItem<CommonRegistryRoot>, item: TreeItem): Promise<IAzureQuickPickItem<UnifiedRegistryItem<CommonRegistryRoot>>> {
        return {
            label: ((item.label as TreeItemLabel)?.label || item.label) as string,
            description: item.description as string,
            data: element,
        };
    }
}

