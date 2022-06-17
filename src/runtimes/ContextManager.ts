/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { InspectContextsItem, ListContextItem } from '@microsoft/container-runtimes';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';

export type Context = ListContextItem;

// An interface is needed so unit tests can mock this
export interface IContextManager {
    onContextChanged: vscode.Event<Context | undefined>;
    getContexts(): Promise<Context[]>;
    getCurrentContext(): Promise<Context | undefined>;
    isInCloudContext(): Promise<boolean>;
    useContext(name: string): Promise<void>;
    removeContext(name: string): Promise<void>;
    inspectContext(name: string): Promise<InspectContextsItem | undefined>;
}

/**
 * Because changing container contexts can have a few bonus effects (like setting some
 * VSCode contexts for controlling command visibility), route all context querying
 * through a single point
 */
export class ContextManager {
    private readonly onContextChangedEmitter = new vscode.EventEmitter<Context | undefined>();
    public readonly onContextChanged = this.onContextChangedEmitter.event;

    private lastContext: Context | undefined;

    public async getContexts(): Promise<Context[]> {
        const allContexts = await ext.defaultShellCR()(
            ext.containerClient.listContexts({})
        ) || [];
        const currentContext: Context | undefined = this.tryGetCurrentContext(allContexts);

        if (currentContext?.name !== this.lastContext?.name ||
            currentContext?.type !== this.lastContext?.type) {
            this.onContextChangedEmitter.fire(currentContext);
        }

        this.lastContext = currentContext;

        return allContexts;
    }

    public async getCurrentContext(): Promise<Context | undefined> {
        return this.tryGetCurrentContext(await this.getContexts());
    }

    public async isInCloudContext(): Promise<boolean> {
        const currentContext = await this.getCurrentContext();

        return !!(currentContext?.type) && // Context must exist and have a type
            /aci|ecs/i.test(currentContext.type); // Context type must be ACI or ECS
    }

    public async useContext(name: string): Promise<void> {
        await ext.defaultShellCR()(
            ext.containerClient.useContext({ context: name })
        );
        await this.getCurrentContext(); // Reestablish the current context, to cause the change emitter to fire indirectly if the context has actually changed
    }

    public async removeContext(name: string): Promise<void> {
        await ext.defaultShellCR()(
            ext.containerClient.removeContexts({ contexts: [name] })
        );
    }

    public async inspectContext(name: string): Promise<InspectContextsItem | undefined> {
        const result = await ext.defaultShellCR()(
            ext.containerClient.inspectContexts({ contexts: [name] })
        );
        return result?.[0];
    }

    private tryGetCurrentContext(allContexts: Context[]): Context | undefined {
        if (allContexts.length === 0) {
            return undefined;
        } else if (allContexts.length === 1) {
            return allContexts[0];
        } else {
            return allContexts.find(c => c.current);
        }
    }
}
