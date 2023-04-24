/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DockerLabels, TaskDefinitionBase } from './TaskDefinitionBase';

export interface DockerBuildOptions {
    buildArgs?: { [key: string]: string };
    context?: string;
    dockerfile?: string;
    labels?: DockerLabels;
    platform?: string;
    tag?: string;
    target?: string;
    pull?: boolean;
    customOptions?: string;
    useSdkBuild?: boolean;
}

export interface DockerBuildTaskDefinitionBase extends TaskDefinitionBase {
    dockerBuild?: DockerBuildOptions;
}
