/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ContainerPlatform } from "../../runtimes/docker";
import { TaskDefinitionBase } from "../TaskDefinitionBase";

export interface NetCoreSdkBuildOptions {
    tag?: string;

    platform?: ContainerPlatform;

    configuration?: string;
}

export interface NetCoreSdkBuildDefinitionBase extends TaskDefinitionBase {
    netcoreSdkBuild?: NetCoreSdkBuildOptions;
}
