/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContextValueFilterQuickPickOptions, ContextValueQuickPickStep, GenericQuickPickStep, IActionContext, IWizardOptions, PickFilter, QuickPickWizardContext, RecursiveQuickPickStep, UserCancelledError, runQuickPickWizard } from '@microsoft/vscode-azext-utils';
import { CommonRegistryItem, CommonRegistryRoot } from '@microsoft/vscode-docker-registries';
import { MessageItem, TreeItem, commands, l10n, window } from 'vscode';
import { CreatePickAcrPromptStep } from '../commands/images/pushImage/CreatePickAcrPromptStep';
import { ext } from '../extensionVariables';
import { AzureSubscriptionRegistryItem } from '../tree/registries/Azure/AzureRegistryDataProvider';
import { isConnectRegistryTreeItem } from '../tree/registries/ConnectRegistryTreeItem';
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
    const registryRoots = await ext.registriesTree.getChildren();
    // if there are no registry providers, throw an error with option to connect a registry provider
    if (registryRoots.length === 0 || (registryRoots.length === 1 && isConnectRegistryTreeItem(registryRoots[0].wrappedItem))) {
        const add: MessageItem = { title: l10n.t('Connect Registry...') };
        void window.showErrorMessage(
            l10n.t('No registry providers are connected. Please connect a registry provider and try again to continue.'),
            ...[add])
            .then((result) => {
                if (result === add) {
                    void commands.executeCommand('vscode-docker.registries.connectRegistry');
                }
            });

        throw new UserCancelledError();
    }

    const unifiedRegistryItem = await runQuickPickWizard<UnifiedRegistryItem<TNode>>(context, {
        hideStepCount: true,
        promptSteps: [
            new RegistryProviderQuickPickStep(ext.registriesTree, options)
        ],
    });

    return unifiedRegistryItem;
}

export async function subscriptionExperience(context: IActionContext): Promise<UnifiedRegistryItem<AzureSubscriptionRegistryItem>> {
    return registryExperience<AzureSubscriptionRegistryItem>(context,
        {
            registryFilter: { include: [ext.azureRegistryDataProvider.label] },
            contextValueFilter: { include: /azuresubscription/i },
            skipIfOne: true
        }
    );
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

export class RegistryProviderQuickPickStep extends GenericQuickPickStep<QuickPickWizardContext, RegistryExperienceOptions> {
    public readonly pickFilter: PickFilter;

    public constructor(
        protected readonly treeDataProvider: UnifiedRegistryTreeDataProvider,
        protected readonly pickOptions: RegistryExperienceOptions,
    ) {
        super(treeDataProvider, pickOptions, { placeHolder: l10n.t('Select registry provider') });
        this.pickFilter = new RegistryPickFilter(pickOptions);
    }

    public async getSubWizard(wizardContext: QuickPickWizardContext): Promise<IWizardOptions<QuickPickWizardContext>> {
        const treeItem = await this.treeDataProvider.getTreeItem(wizardContext.pickedNodes[0] as UnifiedRegistryItem<CommonRegistryRoot>);

        if (treeItem.label === ext.azureRegistryDataProvider.label) {
            // If it's Azure, we need to put in a subscription pick step, then an ACR+Create step, and then optionally a context value step
            return {
                promptSteps: [
                    new ContextValueQuickPickStep(this.treeDataProvider, this.pickOptions as ContextValueFilterQuickPickOptions),
                    new CreatePickAcrPromptStep(),
                ],
            };
        }

        if (this.pickOptions.contextValueFilter) {
            return {
                promptSteps: [new RecursiveQuickPickStep(this.treeDataProvider, this.pickOptions as ContextValueFilterQuickPickOptions)],
                hideStepCount: true,
            };
        }

        return undefined;
    }
}
