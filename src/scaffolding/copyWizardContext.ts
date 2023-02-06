/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ScaffoldingWizardContext } from './wizard/ScaffoldingWizardContext';

export function copyWizardContext(wizardContext: Partial<ScaffoldingWizardContext>, priorWizardContext: ScaffoldingWizardContext | undefined): void {
    if (!priorWizardContext) {
        return;
    }

    for (const prop of Object.keys(priorWizardContext)) {
        // Skip properties from IActionContext
        if (prop === 'telemetry' ||
            prop === 'errorHandling' ||
            prop === 'ui' ||
            prop === 'valuesToMask') {
            continue;
        }

        wizardContext[prop] = priorWizardContext[prop];
    }
}
