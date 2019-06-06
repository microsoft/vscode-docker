/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Uri } from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { scheduleRunRequest } from './scheduleRunRequest';

export async function runFileAsAzureTask(context: IActionContext, uri?: Uri): Promise<void> {
    await scheduleRunRequest(context, "FileTaskRunRequest", uri);
}
