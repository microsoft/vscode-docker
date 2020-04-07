/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventEmitter } from "vscode";

export interface DockerTaskEvent {
    name: string,
    success: boolean,
    error?: string
}

export const dockerTaskEndEventListener = new EventEmitter<DockerTaskEvent>();
