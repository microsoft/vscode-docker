/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * Template string processor that conditionally excludes string literal components that precede an expression
 * that evaluates to an empty string, null, or undefined. Specifically intended to simplify filtering for
 * label strings in a map/reduce.
 * @param strings String literal components of a template string
 * @param expr Expression components of a template string
 * @returns The resulting string where string literals before an expression are conditionally excluded
 */
export function conditional(strings: TemplateStringsArray, ...expr: Array<string | null | undefined>): string {
    return expr.reduce<string>(
        (accumulator, currentExpr, index) => {
            if (!!currentExpr) {
                return accumulator + strings[index] + currentExpr;
            }

            return accumulator;
        },
        '',
    ) as string + strings.slice(-1); // A bug in the Inlay Hints feature is fixed by this redundant `as string` casting
}
