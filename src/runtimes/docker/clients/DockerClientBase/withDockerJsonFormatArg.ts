/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { composeArgs, withArg, withVerbatimArg } from '../../utils/commandLineBuilder';

// Because Docker's wrapper script would split up `{{json .}}` into two arguments, we need to
// pre-quote it to prevent that, for cases where we're executing without a shell.
// Making it a verbatim argument also prevents it from being requoted later.
export const withDockerJsonFormatArg = composeArgs(
    withArg('--format'),
    withVerbatimArg('"{{json .}}"'),
);
