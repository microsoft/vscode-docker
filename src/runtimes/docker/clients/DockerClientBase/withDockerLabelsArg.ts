/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Labels } from "../../contracts/ContainerClient";
import { withNamedArg } from "../../utils/commandLineBuilder";

export function withDockerLabelsArg(labels?: Labels) {
    return withNamedArg(
        '--label',
        Object.entries(labels || {}).map(([label, value]) => `${label}=${value}`),
    );
}
