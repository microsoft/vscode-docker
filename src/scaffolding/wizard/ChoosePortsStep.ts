/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { AzureWizardPromptStep } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ChoosePortsStep extends AzureWizardPromptStep<ScaffoldingWizardContext> {
    public constructor(private readonly defaultPorts: number[]) {
        super();
    }

    public async prompt(wizardContext: ScaffoldingWizardContext): Promise<void> {
        const opt: vscode.InputBoxOptions = {
            placeHolder: this.defaultPorts.join(', '),
            prompt: localize('vscode-docker.scaffold.choosePortsStep.whatPorts', 'What port(s) does your app listen on? Enter a comma-separated list, or empty for no exposed port.'),
            value: this.defaultPorts.join(', '),
            validateInput: (value: string): string | undefined => {
                const result = splitPorts(value);
                if (!result) {
                    return localize('vscode-docker.scaffold.choosePortsStep.portsFormat', 'Ports must be a comma-separated list of positive integers (1 to 65535), or empty for no exposed port.');
                }

                return undefined;
            }
        };

        wizardContext.ports = splitPorts(await ext.ui.showInputBox(opt))
    }

    public shouldPrompt(wizardContext: ScaffoldingWizardContext): boolean {
        return wizardContext.ports === undefined;
    }
}

export async function promptForPorts(ports: number[]): Promise<number[]> {
    let opt: vscode.InputBoxOptions = {
        placeHolder: ports.join(', '),
        prompt: localize('vscode-docker.configUtils.whatPort', 'What port(s) does your app listen on? Enter a comma-separated list, or empty for no exposed port.'),
        value: ports.join(', '),
        validateInput: (value: string): string | undefined => {
            let result = splitPorts(value);
            if (!result) {
                return localize('vscode-docker.configUtils.portsFormat', 'Ports must be a comma-separated list of positive integers (1 to 65535), or empty for no exposed port.');
            }

            return undefined;
        }
    }

    return splitPorts(await ext.ui.showInputBox(opt));
}

/**
 * Splits a comma separated string of port numbers
 */
function splitPorts(value: string): number[] | undefined {
    if (!value || value === '') {
        return [];
    }

    let elements = value.split(',').map(p => p.trim());
    let matches = elements.filter(p => p.match(/^-*\d+$/));

    if (matches.length < elements.length) {
        return undefined;
    }

    let ports = matches.map(Number);

    // If anything is non-integral or less than 1 or greater than 65535, it's not valid
    if (ports.some(p => !Number.isInteger(p) || p < 1 || p > 65535)) {
        return undefined;
    }

    return ports;
}
