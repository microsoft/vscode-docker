/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { innerQuoted, withNamedArg } from '../../utils/commandLineBuilder';

// The Docker CLI requires weak quoting of the --format argument
export const withDockerJsonFormatArg = withNamedArg('--format', innerQuoted('{{json .}}'));
