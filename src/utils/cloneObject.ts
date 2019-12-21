/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable-next-line @typescript-eslint/no-explicit-any */
export function cloneObject<T = any>(obj: T): T {
    if (obj === undefined) {
        return undefined;
    }

    return <T>JSON.parse(JSON.stringify(obj));
}
