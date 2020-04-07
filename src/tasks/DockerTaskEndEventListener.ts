/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface DockerTaskEvent {
    name: string,
    success: boolean,
    error?: string
}

export class DockerTaskEndEventListener {
    private listeners: { (data?: DockerTaskEvent): void; }[] = [];

    public subscribe(listener: { (data?: DockerTaskEvent): void }) : void {
        this.listeners.push(listener);
    }

    public unsubscribe(listener: { (data?: DockerTaskEvent): void }) : void {
        this.listeners = this.listeners.filter(h => h !== listener);
    }

    public trigger(data?: DockerTaskEvent) {
        this.listeners.forEach(listener => listener(data));
    }
}

export const dockerTaskEndEventListener = new DockerTaskEndEventListener();
