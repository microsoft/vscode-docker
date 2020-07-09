/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { openExternal } from "../../utils/openExternal";

export async function configureDockerContextsExplorer(context: IActionContext): Promise<void> {
    await ext.contextsRoot.configureExplorer(context);
}

export async function dockerContextsHelp(_context: IActionContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    openExternal('https://aka.ms/helpicon_dockercontext');
}
