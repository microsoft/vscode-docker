/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export async function delay(ms: number): Promise<void> {
    return new Promise<void>(resolve => {
        setTimeout(() => { resolve(); }, ms);
    });
}

export async function delayWithResult<T>(ms: number, result: T): Promise<T> {
    return new Promise<T>(resolve => {
        setTimeout(() => { resolve(result); }, ms);
    });
}
