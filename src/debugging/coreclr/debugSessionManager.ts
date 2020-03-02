/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import * as vscode from 'vscode';
import { localize } from '../../localize';
import { DockerManager } from './dockerManager';

export interface DebugSessionManager {
    startListening(): void;
    stopListening(): void;
}

export class DockerDebugSessionManager implements DebugSessionManager, vscode.Disposable {
    private eventSubscription: vscode.Disposable | undefined;

    public constructor(
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
                        // eslint-disable-next-line @typescript-eslint/tslint/config
                        .catch(reason => console.log(localize('vscode-docker.debug.coreclr.cleanupFailed', 'Unable to clean up Docker images after launch: {0}', reason?.toString())));

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
