/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import { ext } from '../../extensionVariables';
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";

export async function getRegistryPassword(cached: ICachedRegistryProvider): Promise<string | undefined> {
    return ext.context.secrets.get(getRegistryPasswordKey(cached));
}

export async function setRegistryPassword(cached: ICachedRegistryProvider, password: string): Promise<void> {
    return ext.context.secrets.store(getRegistryPasswordKey(cached), password);
}

export async function deleteRegistryPassword(cached: ICachedRegistryProvider): Promise<void> {
    return ext.context.secrets.delete(getRegistryPasswordKey(cached));
}

function getRegistryPasswordKey(cached: ICachedRegistryProvider): string {
    return getPseudononymousStringHash(cached.id + cached.api + (cached.url || '') + (cached.username || ''));
}

function getPseudononymousStringHash(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
}
