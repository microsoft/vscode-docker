/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Task } from "vscode";
import { DockerTaskProvider } from "../DockerTaskProvider";
import { DockerTaskExecutionContext } from "../TaskHelper";

export class NetCoreSdkBuildProvider extends DockerTaskProvider {

    protected executeTaskInternal(context: DockerTaskExecutionContext, task: Task): Promise<void> {
        throw new Error("Method not implemented.");
    }

}
