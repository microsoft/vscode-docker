/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as os from 'os';
import { IActionContext } from 'vscode-azureextensionui';
import { DockerOSType } from '../docker/Common';
import { ext } from '../extensionVariables';

// eslint-disable-next-line @typescript-eslint/tslint/config
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
