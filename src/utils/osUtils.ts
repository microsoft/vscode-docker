/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import * as path from 'path';
import * as vscode from 'vscode';
import { IActionContext } from '@microsoft/vscode-azext-utils';
import { DockerOSType } from '../docker/Common';
import { ext } from '../extensionVariables';

export async function getDockerOSType(context: IActionContext): Promise<DockerOSType> {
    if (os.platform() !== 'win32') {
        // On Linux or macOS, this can only ever be linux,
        // so short-circuit the Docker call entirely.
        return 'linux';
    } else {
        const info = await ext.dockerClient.info(context);
        return info?.OSType || 'linux';
    }
}

let counter = 0;

export function getTempFileName(): string {
    return path.join(os.tmpdir(), `${vscode.env.sessionId}-${counter++}.tmp`);
}

export function isWindows(): boolean {
    return os.platform() === 'win32';
}

export function isMac(): boolean {
    return os.platform() === 'darwin';
}

export function isArm64Mac(): boolean {
    return isMac() && os.arch() === 'arm64';
}

export function isLinux(): boolean {
    return os.platform() !== 'win32' && os.platform() !== 'darwin';
}
