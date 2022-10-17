/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerContextRecord = {
    Name: string;
    Current: boolean;
    Description?: string;
    DockerEndpoint?: string;
};

export function isDockerContextRecord(maybeContext: unknown): maybeContext is DockerContextRecord {
    const context = maybeContext as DockerContextRecord;

    if (!context || typeof context !== 'object') {
        return false;
    }

    if (typeof context.Name !== 'string') {
        return false;
    }

    if (typeof context.Current !== 'boolean') {
        return false;
    }

    return true;
}
