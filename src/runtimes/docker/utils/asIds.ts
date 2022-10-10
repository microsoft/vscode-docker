/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Parses standard out and removes empty lines to return a list of IDs
 * @param output The standard out from a runtime command
 * @returns An array of string IDs
 */
export function asIds(output: string) {
    return output.split('\n').filter((id) => id);
}
