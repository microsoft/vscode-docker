/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TelemetryProperties, UserCancelledError } from "vscode-azureextensionui";

// tslint:disable-next-line: no-any
export function wrapWithCatch<TReturn, TPrompt extends (...args: []) => Promise<TReturn>>(prompt: TPrompt, onRejected: (reason: any) => Promise<TReturn>): TPrompt {
    return <TPrompt>(async (...args: []) => {
        return prompt(...args).catch(onRejected);
    });
}

export function captureCancelStep<TCancelStep, TReturn, TPrompt extends (...args: []) => Promise<TReturn>>(cancelStep: TCancelStep, properties: TelemetryProperties, prompt: TPrompt): TPrompt {
    return wrapWithCatch(
        prompt,
        error => {
            if (error instanceof UserCancelledError) {
                properties.cancelStep = cancelStep.toString();
            }

            throw error;
        });
}
