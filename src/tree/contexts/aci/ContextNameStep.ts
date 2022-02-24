/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureNameStep } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { localize } from '../../../localize';
import { getAzExtAzureUtils } from '../../../utils/lazyPackages';
import { IAciWizardContext } from './IAciWizardContext';

export class ContextNameStep extends AzureNameStep<IAciWizardContext> {
    protected async isRelatedNameAvailable(context: IAciWizardContext, name: string): Promise<boolean> {
        const azExtAzureUtils = await getAzExtAzureUtils();
        return await azExtAzureUtils.ResourceGroupListStep.isNameAvailable(context, name);
    }

    public async prompt(context: IAciWizardContext): Promise<void> {
        const currentContextNames = (await ext.dockerContextManager.getContexts()).map(c => c.Name);
        context.contextName = await context.ui.showInputBox({ prompt: localize('vscode-docker.tree.contexts.create.aci.enterContextName', 'Enter context name'), validateInput: (value: string | undefined) => validateContextName(value, currentContextNames) });

        const azExtAzureUtils = await getAzExtAzureUtils();
        context.relatedNameTask = this.generateRelatedName(context, context.contextName, azExtAzureUtils.resourceGroupNamingRules);
    }

    public shouldPrompt(wizardContext: IAciWizardContext): boolean {
        return !wizardContext.contextName;
    }
}

// Slightly more strict than CLI
const contextNameRegex = /^[a-z0-9][a-z0-9_-]+$/i;
function validateContextName(value: string | undefined, currentContextNames: string[]): string | undefined {
    if (!contextNameRegex.test(value)) {
        return localize('vscode-docker.tree.contexts.create.aci.contextNameValidation', 'Context names must be start with an alphanumeric character and can only contain alphanumeric characters, underscores, and dashes.');
    } else if (currentContextNames.some(c => c === value)) { // Intentionally case sensitive; Docker allows multiple contexts of same name with different case
        return localize('vscode-docker.tree.contexts.create.aci.contextNameUnique', 'Context names must be unique. There is already a context named \'{0}\'.', value);
    } else {
        return undefined;
    }
}
