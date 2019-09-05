/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// tslint:disable-next-line: no-any
export function cloneObject<T = any>(obj: T): T {
    if (obj === undefined) {
        return undefined;
    }

    return <T>JSON.parse(JSON.stringify(obj));
}
