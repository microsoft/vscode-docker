/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import { openExternal } from "../../utils/openExternal";

export async function registryHelp(context: IActionContext): Promise<void> {
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    openExternal('https://aka.ms/helpicon_containerregistries');
}
