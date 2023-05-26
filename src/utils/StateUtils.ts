/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../extensionVariables';

export async function getFromWorkspaceState<T>(key: string): Promise<T> {
    return ext.context.workspaceState.get<T>(key);
}

export async function updateWorkspaceState<T>(key: string, value: T): Promise<void> {
    return ext.context.workspaceState.update(key, value);
}


