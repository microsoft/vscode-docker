/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, ContextValueFilterQuickPickOptions, GenericQuickPickStep, IActionContext, IAzureQuickPickItem, QuickPickWizardContext, RecursiveQuickPickStep, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryItem } from '@microsoft/vscode-docker-registries';
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

export class RegistryQuickPickStep extends GenericQuickPickStep<QuickPickWizardContext, RegistryExperienceOptions> {
    public constructor(
        protected readonly treeDataProvider: UnifiedRegistryTreeDataProvider,
        protected readonly pickOptions: RegistryExperienceOptions,
    ) {
        super(treeDataProvider, pickOptions);
    }

    protected async getPicks(wizardContext: QuickPickWizardContext): Promise<IAzureQuickPickItem<unknown>[]> {
        const unfilteredPicks = await super.getPicks(wizardContext);

        let filteredPicks: IAzureQuickPickItem<unknown>[];

        if (this.pickOptions.registryFilter?.exclude) {
            filteredPicks = unfilteredPicks.filter(p => !this.pickOptions.registryFilter.exclude.includes(p.label));
        } else if (this.pickOptions.registryFilter?.include) {
            filteredPicks = unfilteredPicks.filter(p => this.pickOptions.registryFilter.include.includes(p.label));
        } else {
            filteredPicks = unfilteredPicks;
        }

        return filteredPicks;
    }
}
