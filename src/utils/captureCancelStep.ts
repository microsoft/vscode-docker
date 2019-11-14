/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TelemetryProperties, UserCancelledError } from "vscode-azureextensionui";

export async function captureCancelStep<TCancelStep, TReturnValue>(cancelStep: TCancelStep, properties: TelemetryProperties, prompt: () => Promise<TReturnValue>): Promise<TReturnValue> {
    try {
        return await prompt();
    } catch (error) {
        if (error instanceof UserCancelledError) {
            properties.cancelStep = cancelStep.toString();
        }

        throw error;
    }
}
