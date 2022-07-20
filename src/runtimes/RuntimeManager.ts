/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { ClientIdentity, DockerClient, DockerComposeClient } from '@microsoft/container-runtimes';
// import { TimeoutPromiseSource } from '../utils/promiseUtils';

// const ClientRegistrationTimeout = 500;

export abstract class RuntimeManager<TClient extends ClientIdentity> extends vscode.Disposable {
    private readonly _runtimeClients = new Map<string, TClient>();
    protected readonly runtimeClientRegisteredEmitter = new vscode.EventEmitter<TClient>();

    private currentClientPromise: Promise<TClient>;

    protected constructor(clientSettingName: string) {
        super(() => { /* Do nothing */ });
        // const disposables = vscode.Disposable.from(
        //     vscode.workspace.onDidChangeConfiguration(cce => {
        //         if (cce.affectsConfiguration(`docker.${clientSettingName}`)) {
        //             this.initClientPromise(vscode.workspace.getConfiguration('docker').get<string>(clientSettingName));
        //         }
        //     })
        // );

        // super(() => {
        //     disposables.dispose();
        // });

        //this.initClientPromise(vscode.workspace.getConfiguration('docker').get<string>(clientSettingName));
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

    public async getClient(): Promise<TClient> {
        //return this.currentClientPromise;
        return this._runtimeClients.get(DockerClient.ClientId) || this._runtimeClients.get(DockerComposeClient.ClientId);
    }

    public abstract getCommand(): Promise<string>;

    // private initClientPromise(clientId: string): void {
    //     const tps = new TimeoutPromiseSource(ClientRegistrationTimeout);
    //     const clientRegistrationPromise = new Promise<TClient>((resolve) => {
    //         const disposable = this.runtimeClientRegisteredEmitter.event(client => {
    //             // if (client.id === clientId) {
    //             if (client.id === DockerClient.ClientId || client.id === DockerComposeClient.ClientId) {
    //                 disposable.dispose();
    //                 resolve(client);
    //             }
    //         });
    //     });
    //     this.currentClientPromise = Promise.race<TClient>([clientRegistrationPromise, tps.promise]);
    // }
}
