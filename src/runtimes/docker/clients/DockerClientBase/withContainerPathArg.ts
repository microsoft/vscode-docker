/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ReadFileCommandOptions, WriteFileCommandOptions } from "../../contracts/ContainerClient";
import { CommandLineCurryFn, withArg } from "../../utils/commandLineBuilder";

export function withContainerPathArg(options: ReadFileCommandOptions | WriteFileCommandOptions): CommandLineCurryFn {
    return withArg(`${options.container}:${options.path}`);
}
