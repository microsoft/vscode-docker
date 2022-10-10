/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Coalesces a value to an array
 * @param params Coallesce an array or individual item(s) to an array
 * @returns params as an array
 */
export function toArray<T>(...params: Array<Array<T> | T>): Array<T> {
    return ([] as Array<T>).concat(...params);
}
