// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

// import * as vscode from 'vscode';
// import { IActionContext, UserCancelledError } from '@microsoft/vscode-azext-utils';
// import { scheduleRunRequest } from './scheduleRunRequest';

// export async function runFileAsAzureTask(context: IActionContext, uri?: vscode.Uri): Promise<void> {
//     if (!vscode.workspace.isTrusted) {
//         throw new UserCancelledError('enforceTrust');
//     }

//     await scheduleRunRequest(context, "FileTaskRunRequest", uri);
// }
