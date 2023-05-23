/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ext } from '../extensionVariables';

export enum IsolationMode {
    hyperv = 'hyperv',
    process = 'process'
}


export async function getIsolationMode(containerName: string): Promise<string> {
    const inspectInfo = (await ext.runWithDefaults(client =>
        client.inspectContainers({ containers: [containerName] })
    ))?.[0];

    return inspectInfo?.isolation;
}
