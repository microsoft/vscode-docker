/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as crypto from 'crypto';
import { ext } from '../../extensionVariables';
import { ICachedRegistryProvider } from "./ICachedRegistryProvider";

const sessionPasswords: Map<string, string> = new Map<string, string>();

const serviceId: string = 'ms-azuretools.vscode-docker';

export async function getRegistryPassword(cached: ICachedRegistryProvider): Promise<string | undefined> {
    const key = getRegistryPasswordKey(cached);
    let password = sessionPasswords.get(key);
    if (!password && ext.keytar) {
        password = await ext.keytar.getPassword(serviceId, key);
        if (password) {
            sessionPasswords.set(key, password);
        }
    }

    return password;
}

export async function setRegistryPassword(cached: ICachedRegistryProvider, password: string): Promise<void> {
    const key = getRegistryPasswordKey(cached);
    sessionPasswords.set(key, password);
    if (ext.keytar) {
        await ext.keytar.setPassword(serviceId, key, password);
    }
}

export async function deleteRegistryPassword(cached: ICachedRegistryProvider): Promise<void> {
    const key = getRegistryPasswordKey(cached);
    sessionPasswords.delete(key);
    if (ext.keytar) {
        await ext.keytar.deletePassword(serviceId, key);
    }
}

function getRegistryPasswordKey(cached: ICachedRegistryProvider): string {
    return getPseudononymousStringHash(cached.id + cached.api + (cached.url || '') + (cached.username || ''));
}

function getPseudononymousStringHash(s: string): string {
    return crypto.createHash('sha256').update(s).digest('hex');
}
