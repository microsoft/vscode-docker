/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import * as vscode from "vscode";
import { ext } from "../../extensionVariables";

export async function configureDockerContextsExplorer(context: IActionContext): Promise<void> {
    await ext.contextsRoot.configureExplorer(context);
}

export async function dockerContextsHelp(context: IActionContext): Promise<void> {
    void vscode.env.openExternal(vscode.Uri.parse('https://aka.ms/helpicon_dockercontext'));
}
