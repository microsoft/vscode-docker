/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellQuotedString, ShellQuoting } from "vscode";
import { Shell } from "../../utils/spawnStreamAsync";

export type GoTemplateJsonFormatOptions<T> = Record<Extract<keyof T, string>, string>;

/**
 * Templatized string helper that wraps a Go template property path in JSON formating
 * @param strings String literal components of the templatized string
 * @param expr Expression values from the templatized string
 * @returns A JSON formatted Go template property
 */
export function goTemplateJsonProperty(strings: TemplateStringsArray, ...expr: Array<string>): string {
    return '{{json ' + expr.reduce<string>((accum, cur, index) => accum + strings[index] + expr, '') + strings.slice(-1) + '}}';
}

/**
 * Normalize JSON output from a Go template to a JSON object matching a given type interface
 * @param formatMapping Mapping to normalize Go template output to a standardized JSON object
 * @param overrideMapping Optional overrides that can replace the mapping for a particular JSON object property
 * @returns A normalized JSON object matching the type constraint from template parameter T
 */
export function goTemplateJsonFormat<T>(
    shell: Shell | null | undefined,
    formatMapping: GoTemplateJsonFormatOptions<T>,
    overrideMapping: Partial<GoTemplateJsonFormatOptions<T>> = {},
): ShellQuotedString {
    const mappings = {
        ...formatMapping,
        ...overrideMapping || {},
    };

    const keyMappings = Object.entries(mappings)
        .map(([key, value]) => {
            return `"${key}":${value}`;
        });
    return Shell.getShellOrDefault(shell).goTemplateQuotedString(`{${keyMappings.join(',')}}`, ShellQuoting.Strong);
}
