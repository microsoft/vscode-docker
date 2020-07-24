/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export abstract class GatherInformationStep<TWizardContext extends ScaffoldingWizardContext> extends AzureWizardPromptStep<TWizardContext> {

}
