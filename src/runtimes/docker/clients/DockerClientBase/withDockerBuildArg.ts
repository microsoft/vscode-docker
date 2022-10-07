/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { withNamedArg } from "../../utils/commandLineBuilder";

export function withDockerBuildArg(buildArgs?: Record<string, string>) {
    return withNamedArg('--build-arg', Object.entries(buildArgs || {}).map(([key, value]) => `${key}=${value}`));
}
