/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilterQuickPickOptions, GenericQuickPickStep, IActionContext, PickFilter, QuickPickWizardContext, RecursiveQuickPickStep, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryItem } from '@microsoft/vscode-docker-registries';
import { TreeItem, l10n } from 'vscode';
import { ext } from '../extensionVariables';
import { UnifiedRegistryItem, UnifiedRegistryTreeDataProvider } from '../tree/registries/UnifiedRegistryTreeDataProvider';

export interface RegistryFilter {
    /**
    * This filter will include registry labels that you do want to show in the quick pick.
    */
    include?: string[];

    /**
     * This filter will exclude registry labels that you don't want to show in the quick pick. If `exclude` is present, `include` will be ignored.
     */
    exclude?: string[];
}

export interface RegistryExperienceOptions extends Partial<ContextValueFilterQuickPickOptions> {
    // if registryFilter is undefined, all registries will be shown in the quick pick
    registryFilter?: RegistryFilter;
}

export async function registryExperience<TNode extends CommonRegistryItem>(context: IActionContext, options?: RegistryExperienceOptions): Promise<UnifiedRegistryItem<TNode>> {
    // get the registry provider unified item
    const promptSteps: AzureWizardPromptStep<QuickPickWizardContext>[] = [
        new RegistryQuickPickStep(ext.registriesTree, options)
    ];

    if (options?.contextValueFilter) {
        promptSteps.push(new RecursiveQuickPickStep(ext.registriesTree, options as ContextValueFilterQuickPickOptions));
    }

    const unifiedRegistryItem = await runQuickPickWizard<UnifiedRegistryItem<TNode>>(context, {
        hideStepCount: true,
        promptSteps: promptSteps,
    });

    return unifiedRegistryItem;
}

export class RegistryPickFilter implements PickFilter {
    public constructor(private readonly options: RegistryExperienceOptions) { }

    public isFinalPick(treeItem: TreeItem, element: unknown): boolean {
        if (this.options.contextValueFilter) {
            return false;
        }

        return this.matchesFilters(treeItem.label as string);
    }

    public isAncestorPick(treeItem: TreeItem, element: unknown): boolean {
        return this.matchesFilters(treeItem.label as string);
    }

    private matchesFilters(treeItemLabel: string): boolean {
        if (this.options.registryFilter?.exclude) {
            return !this.options.registryFilter.exclude.includes(treeItemLabel);
        } else if (this.options.registryFilter?.include) {
            return this.options.registryFilter.include.includes(treeItemLabel);
        } else {
            return true;
        }
    }
}

export class RegistryQuickPickStep extends GenericQuickPickStep<QuickPickWizardContext, RegistryExperienceOptions> {
    public readonly pickFilter: PickFilter;

    public constructor(
        protected readonly treeDataProvider: UnifiedRegistryTreeDataProvider,
        protected readonly pickOptions: RegistryExperienceOptions,
    ) {
        super(treeDataProvider, pickOptions, { placeHolder: l10n.t('Select registry provider') });
        this.pickFilter = new RegistryPickFilter(pickOptions);
    }
}
