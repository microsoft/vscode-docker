/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ShellQuotedString } from 'vscode';
import { CommandLineCurryFn, withNamedArg } from '../../utils/commandLineBuilder';

export function withDockerFilterArg(filter: string | ShellQuotedString | (string | ShellQuotedString | null | undefined)[] | null | undefined): CommandLineCurryFn {
    return withNamedArg('--filter', filter);
}

export function withDockerBooleanFilterArg(filter: string, value: boolean | null | undefined): CommandLineCurryFn {
    return withDockerFilterArg(typeof value === 'boolean' ? `${filter}=${value}` : undefined);
}
