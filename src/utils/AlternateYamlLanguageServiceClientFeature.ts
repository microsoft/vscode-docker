/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { AlternateYamlLanguageServiceClientCapabilities } from '@microsoft/compose-language-service/lib/client/AlternateYamlLanguageServiceClientCapabilities';
import * as vscode from 'vscode';
import { ClientCapabilities, FeatureState, StaticFeature } from 'vscode-languageclient';

/**
 * This class will note the features covered by an alternate YAML language service,
 * that the compose language service can disable
 */
export class AlternateYamlLanguageServiceClientFeature implements StaticFeature, vscode.Disposable {
    public getState(): FeatureState {
        return {
            kind: 'static'
        };
    }

    public fillClientCapabilities(capabilities: ClientCapabilities): void {
        // If the RedHat YAML extension is present, we can disable many of the compose language service
        // features
        if (vscode.extensions.getExtension('redhat.vscode-yaml')) {
            const altYamlClientCapabilities: AlternateYamlLanguageServiceClientCapabilities = {
                syntaxValidation: true,
                schemaValidation: true,
                basicCompletions: true,
                advancedCompletions: false, // YAML extension does not have advanced completions for compose docs
                hover: true,
                imageLinks: false, // YAML extension does not have image hyperlinks for compose docs
                formatting: true,
            };

            capabilities.experimental = {
                ...capabilities.experimental,
                alternateYamlLanguageService: altYamlClientCapabilities,
            };
        }
    }

    public initialize(): void {
        // Noop
    }

    public dispose(): void {
        // Noop
    }
}
