/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectContextsItem, ListContextItem } from './docker';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';

// An interface is needed so unit tests can mock this
export interface IContextManager {
    onContextChanged: vscode.Event<ListContextItem | undefined>;
    getContexts(): Promise<ListContextItem[]>;
    getCurrentContext(): Promise<ListContextItem | undefined>;
    useContext(name: string): Promise<void>;
    removeContext(name: string): Promise<void>;
    inspectContext(name: string): Promise<InspectContextsItem | undefined>;
}

/**
 * Because changing container contexts can have a few bonus effects (like setting some
 * VSCode contexts for controlling command visibility), route all context querying
 * through a single point
 */
export class ContextManager implements IContextManager, vscode.Disposable {
    private readonly onContextChangedEmitter = new vscode.EventEmitter<ListContextItem | undefined>();
    public readonly onContextChanged = this.onContextChangedEmitter.event;

    private readonly onContextChangedDisposable: vscode.Disposable;

    private lastContext: ListContextItem | undefined;

    public constructor() {
        this.onContextChangedDisposable = this.onContextChanged(() => { /* Noop for now */ });
    }

    public dispose(): void {
        this.onContextChangedDisposable.dispose();
    }

    public async getContexts(): Promise<ListContextItem[]> {
        const allContexts = await ext.runWithDefaults(client =>
            client.listContexts({})
        ) || [];
        const currentContext: ListContextItem | undefined = this.tryGetCurrentContext(allContexts);

        if (currentContext?.name !== this.lastContext?.name) {
            this.onContextChangedEmitter.fire(currentContext);
        }

        this.lastContext = currentContext;

        return allContexts;
    }

    public async getCurrentContext(): Promise<ListContextItem | undefined> {
        return this.tryGetCurrentContext(await this.getContexts());
    }

    public async useContext(name: string): Promise<void> {
        await ext.runWithDefaults(client =>
            client.useContext({ context: name })
        );
        await this.getCurrentContext(); // Reestablish the current context, to cause the change emitter to fire indirectly if the context has actually changed
    }

    public async removeContext(name: string): Promise<void> {
        await ext.runWithDefaults(client =>
            client.removeContexts({ contexts: [name] })
        );
    }

    public async inspectContext(name: string): Promise<InspectContextsItem | undefined> {
        const result = await ext.runWithDefaults(client =>
            client.inspectContexts({ contexts: [name] })
        );
        return result?.[0];
    }

    private tryGetCurrentContext(allContexts: ListContextItem[]): ListContextItem | undefined {
        if (allContexts.length === 0) {
            return undefined;
        } else if (allContexts.length === 1) {
            return allContexts[0];
        } else {
            return allContexts.find(c => c.current);
        }
    }
}
