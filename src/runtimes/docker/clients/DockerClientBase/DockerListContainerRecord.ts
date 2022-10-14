/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export type DockerListContainerRecord = {
    Id: string;
    Names: string;
    Image: string;
    Ports: string;
    Networks: string;
    Labels: string;
    CreatedAt: string;
    State: string;
    Status: string;
};

// eslint-disable-next-line @typescript-eslint/no-explicit-any
export function isDockerListContainerRecord(maybeContainer: any): maybeContainer is DockerListContainerRecord {
    if (!maybeContainer || typeof maybeContainer !== 'object') {
        return false;
    }

    if (typeof maybeContainer.Id !== 'string') {
        return false;
    }

    if (typeof maybeContainer.Names !== 'string') {
        return false;
    }

    if (typeof maybeContainer.Image !== 'string') {
        return false;
    }

    if (typeof maybeContainer.Ports !== 'string') {
        return false;
    }

    if (typeof maybeContainer.Networks !== 'string') {
        return false;
    }

    if (typeof maybeContainer.Labels !== 'string') {
        return false;
    }

    if (typeof maybeContainer.CreatedAt !== 'string') {
        return false;
    }

    if (typeof maybeContainer.State !== 'string') {
        return false;
    }

    if (typeof maybeContainer.Status !== 'string') {
        return false;
    }

    return true;
}
