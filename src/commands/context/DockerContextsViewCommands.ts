/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";

export async function configureDockerContextsExplorer(context: IActionContext): Promise<void> {
    await ext.contextsRoot.configureExplorer(context);
}

export async function dockerContextsHelp(_context: IActionContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/helpicon_dockercontext'));
}
