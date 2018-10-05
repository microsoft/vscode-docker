/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { DockerManager } from './dockerManager';

export interface DebugSessionManager {
    startListening(): void;
    stopListening(): void;
}

export class DockerDebugSessionManager implements DebugSessionManager, vscode.Disposable {
    private eventSubscription: vscode.Disposable;

    constructor(
        private readonly debugSessionTerminated: vscode.Event<vscode.DebugSession>,
        private readonly dockerManager: DockerManager) {
    }

    public dispose(): void {
        this.stopListening();
    }

    public startListening(): void {
        if (this.eventSubscription === undefined) {
            this.eventSubscription = this.debugSessionTerminated(
                () => {
                    this.dockerManager
                        .cleanupAfterLaunch()
                        .catch(reason => console.log(`Unable to clean up Docker images after launch: ${reason}`));

                    this.stopListening();
                });
        }
    }

    public stopListening(): void {
        if (this.eventSubscription) {
            this.eventSubscription.dispose();
            this.eventSubscription = undefined;
        }
    }
}
