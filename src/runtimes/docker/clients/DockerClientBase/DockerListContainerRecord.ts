/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListContainersItem, PortBinding } from "../../contracts/ContainerClient";
import { dayjs } from '../../utils/dayjs';
import { parseDockerLikeImageName } from "./parseDockerLikeImageName";
import { parseDockerLikeLabels } from "./parseDockerLikeLabels";
import { parseDockerRawPortString } from "./parseDockerRawPortString";

export type DockerListContainerRecord = {
    ID: string;
    Names: string;
    Image: string;
    Ports: string;
    Networks: string;
    Labels: string;
    CreatedAt: string;
    State?: string;
    Status: string;
};

export function isDockerListContainerRecord(maybeContainer: unknown): maybeContainer is DockerListContainerRecord {
    const container = maybeContainer as DockerListContainerRecord;

    if (!container || typeof container !== 'object') {
        return false;
    }

    if (typeof container.ID !== 'string') {
        return false;
    }

    if (typeof container.Names !== 'string') {
        return false;
    }

    if (typeof container.Image !== 'string') {
        return false;
    }

    if (typeof container.Ports !== 'string') {
        return false;
    }

    if (typeof container.Networks !== 'string') {
        return false;
    }

    if (typeof container.Labels !== 'string') {
        return false;
    }

    if (typeof container.CreatedAt !== 'string') {
        return false;
    }

    if (typeof container.Status !== 'string') {
        return false;
    }

    return true;
}

export function normalizeDockerListContainerRecord(container: DockerListContainerRecord, strict: boolean): ListContainersItem {
    const labels = parseDockerLikeLabels(container.Labels);

    const ports = container.Ports
        .split(',')
        .map((port) => port.trim())
        .filter((port) => !!port)
        .reduce<Array<PortBinding>>((portBindings, rawPort) => {
            const parsedPort = parseDockerRawPortString(rawPort);
            if (parsedPort) {
                return portBindings.concat(parsedPort);
            } else if (strict) {
                throw new Error('Invalid container JSON');
            } else {
                return portBindings;
            }
        }, []);

    const networks = container.Networks
        .split(',');

    const name = container.Names.split(',')[0].trim();
    const createdAt = dayjs.utc(container.CreatedAt).toDate();

    return {
        id: container.ID,
        name,
        labels,
        image: parseDockerLikeImageName(container.Image),
        ports,
        networks,
        createdAt,
        state: normalizeContainerState(container),
        status: container.Status,
    };
}

// Exported just for tests, also why the typing is just a subset of the full record
export function normalizeContainerState(container: Pick<DockerListContainerRecord, 'State' | 'Status'>): string {
    if (container.State) {
        return container.State;
    }

    if (/paused/i.test(container.Status)) {
        return 'paused';
    } else if (/exit|terminate|dead/i.test(container.Status)) {
        return 'exited';
    } else if (/created/i.test(container.Status)) {
        return 'created';
    } else if (/up/i.test(container.Status)) {
        return 'running';
    }

    return 'unknown';
}
