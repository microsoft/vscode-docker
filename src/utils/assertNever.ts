/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Assertion fail for scenarios in code which should not be hit (e.g. default switch)
 *
 * Example usage:
 *   switch(nodeType) {
 *     case 'one': break;
 *     case 'two': break;
 *     default:
 *       return assertNever(nodeType, 'node type');
 *   }
 */
export function assertNever(value: never, context?: string): never {
    let contextMessage = context ? ` in context "${context}"` : '';
    throw new Error(`Internal error: Unexpected value found${contextMessage}: ${String(value)}`);
}
