/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GatherInformationStep } from '../GatherInformationStep';
import { JavaScaffoldingWizardContext } from './JavaScaffoldingWizardContext';

export class JavaGatherInformationStep extends GatherInformationStep<JavaScaffoldingWizardContext> {
    public async prompt(wizardContext: JavaScaffoldingWizardContext): Promise<void> {
        // TODO
        // Output path

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: JavaScaffoldingWizardContext): boolean {
        return !wizardContext.javaOutputPath;
    }
}
