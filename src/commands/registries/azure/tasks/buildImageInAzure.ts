/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from "vscode";
import { IActionContext } from 'vscode-azureextensionui';
import { scheduleRunRequest } from './scheduleRunRequest';

export async function buildImageInAzure(context: IActionContext, uri?: vscode.Uri | undefined): Promise<void> {
    await scheduleRunRequest(context, "DockerBuildRequest", uri);
}
