/*!--------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Largely copied from https://github.com/microsoft/compose-language-service/blob/main/src/test/clientExtension/DocumentSettingsClientFeature.ts

import * as vscode from 'vscode';
import { ClientCapabilities, StaticFeature } from 'vscode-languageclient';
import { LanguageClient } from 'vscode-languageclient/node';
import { DocumentSettings, DocumentSettingsNotification, DocumentSettingsNotificationParams, DocumentSettingsParams, DocumentSettingsRequest } from '@microsoft/compose-language-service/lib/client/DocumentSettings';

/**
 * This class implements functionality to allow the language server to request information about an open document (including tab size and line endings), and also
 * notify the language server if those settings change
 */
export class DocumentSettingsClientFeature implements StaticFeature, vscode.Disposable {
    private disposables: vscode.Disposable[] = [];

    public constructor(private readonly client: LanguageClient) { }

    public fillClientCapabilities(capabilities: ClientCapabilities): void {
        const documentSettings = {
            notify: true,
            request: true,
        };

        capabilities.experimental = {
            ...capabilities.experimental,
            documentSettings,
        };
    }

    public initialize(): void {
        this.disposables.push(
            this.client.onRequest(
                DocumentSettingsRequest.method,
                (params: DocumentSettingsParams): DocumentSettings | undefined => {
                    const textEditor = vscode.window.visibleTextEditors.find(e => e.document.uri.toString() === params.textDocument.uri);

                    if (!textEditor) {
                        return undefined;
                    }

                    return {
                        eol: textEditor.document.eol,
                        tabSize: Number(textEditor.options.tabSize),
                    };
                }
            )
        );

        this.disposables.push(
            vscode.window.onDidChangeTextEditorOptions(
                (e: vscode.TextEditorOptionsChangeEvent) => {
                    const params: DocumentSettingsNotificationParams = {
                        textDocument: { uri: e.textEditor.document.uri.toString() },
                        eol: e.textEditor.document.eol,
                        tabSize: Number(e.options.tabSize),
                    };

                    this.client.sendNotification(DocumentSettingsNotification.method, params);
                }
            )
        );
    }

    public dispose(): void {
        this.disposables.forEach(d => d.dispose());
    }
}
