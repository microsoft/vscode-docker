/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';

/**
 * Match an input string against a regex expression. If it matches, return an array of all
 * group results returned by the match, otherwise return the given defaults array.
 */
export function extractRegExGroups(input: string, regex: RegExp, defaults: string[]): string[] {
    let matches = input.match(regex);
    if (matches) {
        // Ignore first item, which is the text of the entire match
        let [, ...groups] = matches;

        assert(groups.length === defaults.length, "extractRegExGroups: length of defaults array does not match length of actual match groups");
        return groups;
    }

    return defaults;
}
