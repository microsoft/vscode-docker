/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

export interface DockerTaskEvent {
    name: string,
    success: boolean,
    error?: string
}

type DockerTaskEventListener = { (taskEvent: DockerTaskEvent): void; };

export class DockerTaskEndEventListener {
    private listeners: DockerTaskEventListener[] = [];

    public subscribe(listener: DockerTaskEventListener) : void {
        this.listeners.push(listener);
    }

    public unsubscribe(listener: DockerTaskEventListener) : void {
        this.listeners = this.listeners.filter(l => l !== listener);
    }

    public emit(taskEvent: DockerTaskEvent) {
        this.listeners.forEach(listener => listener(taskEvent));
    }
}

export const dockerTaskEndEventListener = new DockerTaskEndEventListener();
