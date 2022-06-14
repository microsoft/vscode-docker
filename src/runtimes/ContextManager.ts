/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ListContextItem } from '@microsoft/container-runtimes';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';

type Context = ListContextItem;

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
        const allContexts = await ext.defaultShellCR()(ext.containerClient.listContexts({})) || [];
        const currentContext: Context | undefined = this.tryGetCurrentContext(allContexts);

        if (currentContext?.name !== this.lastContext?.name ||
            currentContext?.type !== this.lastContext?.type) {
            this.onContextChangedEmitter.fire(currentContext);
        }

        this.lastContext = currentContext;

        return allContexts;
    }

    public async getCurrentContext(): Promise<Context | undefined> {
        const allContexts = await this.getContexts();
        return allContexts.find(c => c.current);
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
