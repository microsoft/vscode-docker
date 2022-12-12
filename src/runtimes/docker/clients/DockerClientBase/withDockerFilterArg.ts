/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellQuotedString } from 'vscode';
import { CommandLineCurryFn, innerQuoted, withNamedArg } from '../../utils/commandLineBuilder';

// The Docker CLI requires weak quoting of the --filter argument
export function withDockerFilterArg(filter: string | ShellQuotedString | (string | ShellQuotedString | null | undefined)[] | null | undefined): CommandLineCurryFn {
    return withNamedArg('--filter', Array.isArray(filter) ? filter.map(innerQuoted) : innerQuoted(filter));
}

export function withDockerBooleanFilterArg(filter: string, value: boolean | null | undefined): CommandLineCurryFn {
    return withDockerFilterArg(typeof value === 'boolean' ? `${filter}=${value}` : undefined);
}
