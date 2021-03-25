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
        // Skip telemetry + error handling
        if (prop === 'errorHandling' || prop === 'telemetry') {
            continue;
        }

        // @ts-expect-error: TS doesn't like indexing objects with a string
        wizardContext[prop] = priorWizardContext[prop];
    }
}
