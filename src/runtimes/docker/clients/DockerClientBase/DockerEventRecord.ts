/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { EventAction, EventType } from "../../contracts/ContainerClient";

export type DockerEventRecord = {
    Type: EventType;
    Action: EventAction;
    Actor: {
        ID: string;
        Attributes: Record<string, unknown>;
    };
    Time: number;
    Raw: object;
};

export function isDockerEventRecord(maybeEvent: unknown): maybeEvent is DockerEventRecord {
    const event = maybeEvent as DockerEventRecord;

    if (!event || typeof event !== 'object') {
        return false;
    }

    if (typeof event.Type !== 'string') {
        return false;
    }

    if (typeof event.Action !== 'string') {
        return false;
    }

    if (typeof event.Actor !== 'object') {
        return false;
    }

    if (typeof event.Actor.ID !== 'string') {
        return false;
    }

    if (typeof event.Actor.Attributes !== 'object') {
        return false;
    }

    if (typeof event.Time !== 'number') {
        return false;
    }

    if (!event.Raw || typeof event.Raw !== 'object') {
        return false;
    }

    return true;
}
