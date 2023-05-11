/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { TaskDefinitionBase } from "../TaskDefinitionBase";

export interface NetCoreSdkBuildOptions {
    /**
     * Name of image to build
     */
    imageName?: string;

    /**
     * Tag of image to build
     */
    imageTag?: string;

    platform?: string; // TODO: Change platform to object

    configuration?: string;

    arcitecture?: string;

    os?: string;
}

export interface NetCoreSdkBuildDefinitionBase extends TaskDefinitionBase {
    netcoreSdkBuild?: NetCoreSdkBuildOptions;
}
