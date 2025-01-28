/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { PushImageWizardContext } from './PushImageWizardContext';

export class RefreshRegistriesViewStep extends AzureWizardExecuteStep<PushImageWizardContext> {
    public priority: number = 400;

    public async execute(wizardContext: PushImageWizardContext): Promise<void> {
        void ext.registriesTree.refresh();
    }

    public shouldExecute(wizardContext: PushImageWizardContext): boolean {
        return true;
    }
}
