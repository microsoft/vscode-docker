/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

export class AzureTaskContentProvider implements vscode.TextDocumentContentProvider {
    public static scheme: string = 'task';
    private onDidChangeEvent: vscode.EventEmitter<vscode.Uri> = new vscode.EventEmitter<vscode.Uri>();

    constructor() { }

    public provideTextDocumentContent(uri: vscode.Uri): string {
        const parse: { content: string } = <{ content: string }>JSON.parse(uri.query);
        return decodeBase64(parse.content);
    }

    get onDidChange(): vscode.Event<vscode.Uri> {
        return this.onDidChangeEvent.event;
    }

    public update(uri: vscode.Uri, message: string): void {
        this.onDidChangeEvent.fire(uri);
    }
}

export function decodeBase64(str: string): string {
    return Buffer.from(str, 'base64').toString('utf8');
}

export function encodeBase64(str: string): string {
    return Buffer.from(str, 'ascii').toString('base64');
}

export function openTask(content: string, title: string): void {
    const scheme = 'task';
    let query = JSON.stringify({ 'content': encodeBase64(content) });
    let uri: vscode.Uri = vscode.Uri.parse(`${scheme}://authority/${title}.json?${query}#idk`);
    vscode.workspace.openTextDocument(uri).then((doc) => {
        return vscode.window.showTextDocument(doc, vscode.ViewColumn.Active + 1, true);
    });
}
