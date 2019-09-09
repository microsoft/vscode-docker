/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { DebugConfiguration } from 'vscode';

export interface ServerReadyAction {
    pattern?: string;
    action?: 'openExternally' | 'debugWithChrome';
    uriFormat?: string;
    webRoot?: string;
}

export interface DockerServerReadyAction extends ServerReadyAction {
    containerName?: string;
}

export interface DebugConfigurationBase extends DebugConfiguration {
    preLaunchTask?: string;
    serverReadyAction?: ServerReadyAction;
}

export interface DockerDebugConfigurationBase extends DebugConfigurationBase {
    containerName?: string;
    dockerServerReadyAction?: DockerServerReadyAction;
    removeContainerAfterDebug?: boolean;
}
