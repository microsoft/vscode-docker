/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeItem, callWithTelemetryAndErrorHandling, IActionContext, parseError, registerCommand } from '@microsoft/vscode-azext-utils';
import * as os from 'os';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { EventAction, EventType, isCancellationError } from '../runtimes/docker';
import { debounce } from '../utils/debounce';
import { AllTreePrefixes, TreePrefix } from './TreePrefix';

const pollingIntervalMs = 60 * 1000; // One minute
const eventListenerTries = 3; // The event listener will try at most 3 times to connect for events
const eventListenerLifetimeSeconds = 60 * 5; // Five minutes
const debounceDelayMs = 500; // Refreshes rapidly initiated for the same tree view will be debounced to occur 500ms after the last initiation

type RefreshTarget = AzExtTreeItem | TreePrefix;
type RefreshReason = 'interval' | 'event' | 'config' | 'manual' | 'contextChange';

const ContainerEventActions: EventAction[] = ['create', 'destroy', 'die', 'kill', 'pause', 'rename', 'restart', 'start', 'stop', 'unpause', 'update'];
const ImageEventActions: EventAction[] = ['delete', 'import', 'load', 'pull', 'save', 'tag', 'untag'];
const NetworkEventActions: EventAction[] = ['create', 'destroy', 'remove'];
const VolumeEventActions: EventAction[] = ['create', 'destroy', 'prune']; // Unlike containers/images/networks, when pruning volumes, no `destroy` event is fired, only `prune`, so we listen to that too

export class RefreshManager extends vscode.Disposable {
    private readonly autoRefreshDisposables: vscode.Disposable[] = [];
    private readonly viewOpenedDisposables: vscode.Disposable[] = [];
    private readonly cts: vscode.CancellationTokenSource = new vscode.CancellationTokenSource();
    private autoRefreshSetup: boolean = false;

    public constructor() {
        super(() => vscode.Disposable.from(...this.autoRefreshDisposables, ...this.viewOpenedDisposables).dispose());

        // Refresh on command will be unconditionally set up since it is a user action
        this.setupRefreshOnCommand();

        // When any of these views becomes visible, we will initiate auto refreshes
        // The disposables are kept separate because we dispose of them sooner
        const treeViewsToInitiateAutoRefresh = [
            ext.containersTreeView,
            ext.imagesTreeView,
            ext.networksTreeView,
            ext.volumesTreeView,
            ext.contextsTreeView
        ];

        // If one of the views is already visible, immediately initiate auto-refreshes, otherwise wait for one to become visible
        if (treeViewsToInitiateAutoRefresh.some(v => v.visible)) {
            this.setupAutoRefreshes();
        } else {
            for (const treeView of treeViewsToInitiateAutoRefresh) {
                this.viewOpenedDisposables.push(
                    treeView.onDidChangeVisibility(e => {
                        if (e.visible) {
                            // Dispose of the listeners to this event and empty the array
                            vscode.Disposable.from(...this.viewOpenedDisposables).dispose();
                            this.viewOpenedDisposables.splice(0);

                            // Set up auto refreshes
                            this.setupAutoRefreshes();
                        }
                    })
                );
            }
        }
    }

    private setupAutoRefreshes(): void {
        if (this.autoRefreshSetup) {
            return;
        }
        this.autoRefreshSetup = true;

        // VSCode does *not* cancel by default on disposal of a CancellationTokenSource, so we need to manually cancel
        this.autoRefreshDisposables.unshift(new vscode.Disposable(() => this.cts.cancel()));

        this.setupRefreshOnInterval();
        this.setupRefreshOnRuntimeEvent();
        this.setupRefreshOnConfigurationChange();
        this.setupRefreshOnDockerConfigurationChange();
        this.setupRefreshOnContextChange();
    }

    private setupRefreshOnInterval(): void {
        const timer = setInterval(async () => {
            for (const view of AllTreePrefixes) {
                // Skip the registries view, which does not need to be refreshed on an interval
                if (view === 'registries') {
                    continue;
                }
                await this.refresh(view, 'interval');
            }
        }, pollingIntervalMs);

        this.autoRefreshDisposables.push(new vscode.Disposable(
            () => clearInterval(timer)
        ));
    }

    private setupRefreshOnRuntimeEvent(): void {
        void callWithTelemetryAndErrorHandling('vscode-docker.tree.eventRefresh', async (context: IActionContext) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressIfSuccessful = true;

            const eventTypesToWatch: EventType[] = ['container', 'image', 'network', 'volume'];
            const eventActionsToWatch: EventAction[] = Array.from(new Set<EventAction>([...ContainerEventActions, ...ImageEventActions, ...NetworkEventActions, ...VolumeEventActions]));

            // Try at most `eventListenerTries` times to (re)connect to the event stream
            let errorCount = 0;
            let eventsSinceTimestamp = Math.round(Date.now() / 1000);
            while (errorCount < eventListenerTries) {
                const eventsUntilTimestamp = eventsSinceTimestamp + eventListenerLifetimeSeconds;

                try {
                    const eventGenerator = ext.streamWithDefaults(client =>
                        client.getEventStream({
                            types: eventTypesToWatch,
                            events: eventActionsToWatch,
                            since: eventsSinceTimestamp,
                            until: eventsUntilTimestamp,
                        }),
                        {
                            cancellationToken: this.cts.token,
                        }
                    );

                    for await (const event of eventGenerator) {
                        switch (event.type) {
                            case 'container':
                                await this.refresh('containers', 'event');
                                break;
                            case 'image':
                                await this.refresh('images', 'event');
                                break;
                            case 'network':
                                await this.refresh('networks', 'event');
                                break;
                            case 'volume':
                                await this.refresh('volumes', 'event');
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
                    } else if (++errorCount < eventListenerTries) {
                        // Still in the retry loop
                        continue;
                    } else {
                        // Emit a message and rethrow to get telemetry
                        ext.outputChannel.error(
                            vscode.l10n.t('Failed to set up event listener: {0}', error.message)
                        );

                        throw error;
                    }
                } finally {
                    // Move the next start timestamp to the current end timestamp
                    eventsSinceTimestamp = eventsUntilTimestamp;
                }

                // If the event generator terminates on its expected lifecycle it will exit without an error
                // Continue the loop as normal, starting the next event stream at the previous stop time
                // We intentionally do not reset the `errorCount`, so that at most 3 failures occur before
                // giving up, regardless of whether or not they are consecutive.
            }
        });
    }

    private setupRefreshOnConfigurationChange(): void {
        this.autoRefreshDisposables.push(
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

    private setupRefreshOnDockerConfigurationChange(): void {
        // Docker events do not include context change information, so we set up some filesystem listeners to watch
        // for changes to the Docker config file, which will be triggered by context changes

        void callWithTelemetryAndErrorHandling('vscode-docker.tree.dockerConfigRefresh', async (context: IActionContext) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.suppressIfSuccessful = true;

            const dockerConfigFolderUri = vscode.Uri.joinPath(vscode.Uri.file(os.homedir()), '.docker');
            const dockerConfigFile = 'config.json';
            const dockerConfigFileUri = vscode.Uri.joinPath(dockerConfigFolderUri, dockerConfigFile);
            const dockerContextsFolderUri = vscode.Uri.joinPath(dockerConfigFolderUri, 'contexts', 'meta');

            try {
                // Ensure the file exists--this will throw if it does not
                await vscode.workspace.fs.stat(dockerConfigFileUri);

                const configWatcher = vscode.workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(dockerConfigFolderUri, dockerConfigFile),
                    true,
                    false,
                    true
                );
                this.autoRefreshDisposables.push(configWatcher);

                // Changes to this file tend to happen several times in succession, so we debounce
                const debounceTimerMs = 500;
                let lastTime = Date.now();
                this.autoRefreshDisposables.push(configWatcher.onDidChange(async () => {
                    if (Date.now() - lastTime < debounceTimerMs) {
                        return;
                    }
                    lastTime = Date.now();

                    await this.refresh('contexts', 'event');
                }));
            } catch {
                // Ignore
            }

            try {
                // Ensure the folder exists--this will throw if it does not
                await vscode.workspace.fs.stat(dockerContextsFolderUri);

                const contextWatcher = vscode.workspace.createFileSystemWatcher(
                    new vscode.RelativePattern(dockerContextsFolderUri, '*'),
                    false,
                    true,
                    false
                );
                this.autoRefreshDisposables.push(contextWatcher);

                this.autoRefreshDisposables.push(contextWatcher.onDidCreate(async () => {
                    await this.refresh('contexts', 'event');
                }));

                this.autoRefreshDisposables.push(contextWatcher.onDidDelete(async () => {
                    await this.refresh('contexts', 'event');
                }));
            } catch {
                // Ignore
            }
        });
    }

    private setupRefreshOnContextChange(): void {
        this.autoRefreshDisposables.push(
            ext.runtimeManager.contextManager.onContextChanged(async () => {
                for (const view of AllTreePrefixes) {
                    // Refresh all except contexts, which would already have been refreshed
                    // And registries, which does not need to be refreshed on context change
                    if (view === 'contexts' || view === 'registries') {
                        continue;
                    }
                    await this.refresh(view, 'contextChange');
                }
            })
        );
    }

    private refresh(target: RefreshTarget, reason: RefreshReason): Promise<void> {
        return callWithTelemetryAndErrorHandling('vscode-docker.tree.refresh', async (context: IActionContext) => {
            context.errorHandling.suppressDisplay = true;
            context.telemetry.properties.refreshReason = reason;

            if (isAzExtTreeItem(target)) {
                context.telemetry.properties.refreshTarget = 'node';

                // Refreshes targeting a specific tree item will not be debounced
                await target.refresh(context);
            } else if (typeof target === 'string') {
                context.telemetry.properties.refreshTarget = target;

                let callback: () => Promise<void>;
                switch (target) {
                    case 'containers':
                        callback = () => ext.containersRoot.refresh(context);
                        break;
                    case 'images':
                        callback = () => ext.imagesRoot.refresh(context);
                        break;
                    case 'networks':
                        callback = () => ext.networksRoot.refresh(context);
                        break;
                    case 'registries':
                        callback = () => ext.registriesRoot.refresh(context);
                        break;
                    case 'volumes':
                        callback = () => ext.volumesRoot.refresh(context);
                        break;
                    case 'contexts':
                        callback = () => ext.contextsRoot.refresh(context);
                        break;
                    default:
                        throw new RangeError(`Unexpected view type: ${target}`);
                }

                if (reason === 'manual') {
                    // Manual refreshes will not be debounced--they should occur instantly
                    await callback();
                } else {
                    // Debounce all other refreshes by 500 ms
                    debounce(debounceDelayMs, `${target}.refresh`, callback);
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
