/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from 'vscode-azureextensionui';
import { ext } from '../../../extensionVariables';

export async function createAciContext(actionContext: IActionContext): Promise<void> {
    await ext.contextsRoot.createChild(actionContext);
}
