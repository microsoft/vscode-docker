/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, callWithTelemetryAndErrorHandling, IActionContext, parseError, registerCommand } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { isCancellationError } from '../runtimes/docker';
import { AllTreePrefixes, TreePrefix } from './TreePrefix';

const pollingIntervalMs = 60 * 1000; // One minute
const eventListenerTries = 3; // The event listener will try at most 3 times to connect for events

type RefreshTarget = AzExtTreeItem | TreePrefix;
type RefreshReason = 'interval' | 'event' | 'config' | 'manual';

export class RefreshManager extends vscode.Disposable {
    private readonly disposables: vscode.Disposable[] = [];
    private readonly cts: vscode.CancellationTokenSource = new vscode.CancellationTokenSource();

    public constructor() {
        super(() => vscode.Disposable.from(...this.disposables).dispose());

        // VSCode does *not* cancel by default on disposal of a CancellationTokenSource, so we need to manually cancel
        this.disposables.unshift(new vscode.Disposable(() => this.cts.cancel()));

        this.setupRefreshOnInterval();
        this.setupRefreshOnRuntimeEvent();
        this.setupRefreshOnConfigurationChange();
        this.setupRefreshOnCommand();
    }

    private setupRefreshOnInterval(): void {
        const timer = setInterval(async () => {
            for (const view of AllTreePrefixes) {
                await this.refresh(view, 'interval');
            }
        }, pollingIntervalMs);

        this.disposables.push(new vscode.Disposable(
            () => clearInterval(timer)
        ));
    }

    private setupRefreshOnRuntimeEvent(): void {
        void callWithTelemetryAndErrorHandling('vscode-docker.tree.eventRefresh', async (context: IActionContext) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressIfSuccessful = true;

            // Try at most `eventListenerTries` times to (re)connect to the event stream
            for (let i = 0; i < eventListenerTries; i++) {
                try {
                    // TODO: finish this
                    const eventGenerator = 'foo' as unknown as AsyncGenerator<{ Type: string }>;

                    for await (const event of eventGenerator) {
                        switch (event.Type) {
                            case 'container':
                                await this.refresh('containers', 'event');
                                break;
                            case 'network':
                                await this.refresh('networks', 'event');
                                break;
                            case 'image':
                                await this.refresh('images', 'event');
                                break;
                            case 'volume':
                                await this.refresh('volumes', 'event');
                                break;
                            case 'context':
                                await this.refresh('contexts', 'event');
                                break;
                            default:
                                // Ignore other events
                                break;
                        }
                    }
                } catch (err) {
                    const error = parseError(err);

                    if (isCancellationError(err) || error.isUserCancelledError) {
                        // Cancelled, so don't try again and don't rethrow--this is a normal termination pathway
                        return;
                    } else if (i < eventListenerTries - 1) {
                        // Still in the retry loop
                        continue;
                    } else {
                        // Emit a message and rethrow to get telemetry
                        ext.outputChannel.appendLine(
                            localize('vscode-docker.tree.refreshManager.eventSetupFailure', 'Failed to set up event listener: {0}', error.message)
                        );

                        throw error;
                    }
                }
            }
        });

    }

    private setupRefreshOnConfigurationChange(): void {
        this.disposables.push(
            vscode.workspace.onDidChangeConfiguration(async (e: vscode.ConfigurationChangeEvent) => {
                for (const view of AllTreePrefixes) {
                    if (e.affectsConfiguration(`docker.${view}`)) {
                        await this.refresh(view, 'config');
                    }
                }
            })
        );
    }

    private setupRefreshOnCommand(): void {
        for (const view of AllTreePrefixes) {
            // Because `registerCommand` pushes the disposables onto the `ext.context.subscriptions` array, we don't need to keep track of them
            registerCommand(`vscode-docker.${view}.refresh`, async () => {
                await this.refresh(view, 'manual');
            });
        }
    }

    private refresh(target: RefreshTarget, reason: RefreshReason): Promise<void> {
        return callWithTelemetryAndErrorHandling('vscode-docker.tree.refresh', async (context: IActionContext) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.properties.refreshReason = reason;

            if (isAzExtTreeItem(target)) {
                context.telemetry.properties.refreshTarget = 'node';
                return await target.refresh(context);
            } else if (typeof target === 'string') {
                context.telemetry.properties.refreshTarget = target;
                switch (target) {
                    case 'containers':
                        return await ext.containersRoot.refresh(context);
                    case 'networks':
                        return await ext.networksRoot.refresh(context);
                    case 'images':
                        return await ext.imagesRoot.refresh(context);
                    case 'registries':
                        return await ext.registriesRoot.refresh(context);
                    case 'volumes':
                        return await ext.volumesRoot.refresh(context);
                    case 'contexts':
                        return await ext.contextsRoot.refresh(context);
                    default:
                        throw new RangeError(`Unexpected view type: ${target}`);
                }
            }
        });
    }
}

// TODO: temp: this function is available in newer versions of @microsoft/vscode-azext-utils, use it when available
function isAzExtTreeItem(maybeTreeItem: unknown): maybeTreeItem is AzExtTreeItem {
    return typeof maybeTreeItem === 'object' &&
        !!(maybeTreeItem as AzExtTreeItem).fullId;
}
