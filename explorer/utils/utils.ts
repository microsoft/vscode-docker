/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export function trimWithElipsis(str: string, max: number = 10): string {
    const elipsis: string = "...";
    const len: number = str.length;

    if (max <= 0 || max >= 100) { return str; }
    if (str.length <= max) { return str; }
    if (max < 3) { return str.substr(0, max); }

    const front: string = str.substr(0, (len / 2) - (-0.5 * (max - len - 3)));
    const back: string = str.substr(len - (len / 2) + (-0.5 * (max - len - 3)));

    return front + elipsis + back;
}
