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
    options?: {
        cwd?: string;
        env?: NodeJS.ProcessEnv;
    };
}

export type DockerLabels = { includeDefaults?: boolean; } & { [key: string]: string; };

export const defaultVsCodeLabels: { [key: string]: string } = {
    'com.microsoft.created-by': 'visual-studio-code'
};

export function getAggregateLabels(labels: DockerLabels | undefined, defaultLabels: { [key: string]: string }): { [key: string]: string } {
    const { includeDefaults, ...explicitLabels } = labels || {};

    return (includeDefaults !== false)
        ? { ...defaultLabels, ...explicitLabels }
        : explicitLabels;
}
