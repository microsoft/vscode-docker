/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TaskDefinition } from 'vscode';

export interface DependsOn {
    type?: string;
}

export interface TaskDefinitionBase extends TaskDefinition {
    label?: string;
    dependsOn?: string[] | DependsOn;
}
