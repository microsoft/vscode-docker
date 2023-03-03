/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';
import { TelemetryPromptStep } from './TelemetryPromptStep';

export class ChoosePortsStep extends TelemetryPromptStep<ScaffoldingWizardContext> {
    public constructor(private readonly defaultPorts: number[]) {
        super();
    }

    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        // If there are random suggested ports, show those, otherwise show the default
        const suggestedPorts = wizardContext.suggestedRandomPorts?.length ? wizardContext.suggestedRandomPorts : this.defaultPorts;

        const opt: vscode.InputBoxOptions = {
            placeHolder: suggestedPorts.join(', '),
            prompt: vscode.l10n.t('What port(s) does your app listen on? Enter a comma-separated list, or empty for no exposed port.'),
            value: suggestedPorts.join(', '),
            validateInput: (value: string): string | undefined => {
                const result = splitPorts(value);
                if (!result) {
                    return vscode.l10n.t('Ports must be a comma-separated list of positive integers (1 to 65535), or empty for no exposed port.');
                }

                return undefined;
            }
        };

        wizardContext.ports = splitPorts(await wizardContext.ui.showInputBox(opt));
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return wizardContext.ports === undefined;
    }

    protected setTelemetry(wizardContext: ScaffoldingWizardContext): void {
        wizardContext.telemetry.measurements.numPorts = wizardContext.ports?.length ?? 0;
    }
}

/**
 * Splits a comma separated string of port numbers
 */
function splitPorts(value: string): number[] | undefined {
    if (!value || value === '') {
        return [];
    }

    const elements = value.split(',').map(p => p.trim());
    const matches = elements.filter(p => p.match(/^-*\d+$/));

    if (matches.length < elements.length) {
        return undefined;
    }

    const ports = matches.map(Number);

    // If anything is non-integral or less than 1 or greater than 65535, it's not valid
    if (ports.some(p => !Number.isInteger(p) || p < 1 || p > 65535)) {
        return undefined;
    }

    return ports;
}
