/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { window, workspace } from "vscode";

export namespace fsUtils {
    export async function openJsonInEditor(data: {}): Promise<void> {
        let indentation = 4;
        const content = JSON.stringify(data, undefined, indentation);
        await openInEditor(content, 'json');
    }

    export async function openLogInEditor(data: string): Promise<void> {
        await openInEditor(data, 'log');
    }

    async function openInEditor(content: string, language: string): Promise<void> {
        await window.showTextDocument(await workspace.openTextDocument({ content, language }));
    }
}
