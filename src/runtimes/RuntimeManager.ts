/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ClientIdentity } from './docker';

export abstract class RuntimeManager<TClient extends ClientIdentity> extends vscode.Disposable {
    private readonly _runtimeClients = new Map<string, TClient>();
    protected readonly runtimeClientRegisteredEmitter = new vscode.EventEmitter<TClient>();

    protected constructor(clientSettingName: string) {
        super(() => { /* Do nothing */ });
    }

    public registerRuntimeClient(client: TClient): vscode.Disposable {
        if (!client || !client.id) {
            throw new Error('Invalid client supplied.');
        }

        if (this._runtimeClients.has(client.id)) {
            throw new Error(`A container runtime client with ID '${client.id}' is already registered.`);
        }

        this._runtimeClients.set(client.id, client);

        this.runtimeClientRegisteredEmitter.fire(client);

        return new vscode.Disposable(() => {
            this._runtimeClients.delete(client.id);
        });
    }

    public get runtimeClients(): Array<TClient> {
        return Array.from(this._runtimeClients.values());
    }

    public abstract getClient(): Promise<TClient>;

    public async getCommand(): Promise<string> {
        return (await this.getClient()).commandName;
    }
}
