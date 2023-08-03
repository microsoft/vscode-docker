import { RegistryDataProvider } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';

export interface UnifiedRegistryItem<T> {
    provider: RegistryDataProvider<T>;
    wrappedItem: T;
    parent: UnifiedRegistryItem<T> | undefined;
}

// eslint-disable-next-line @typescript-eslint/naming-convention
const ConnectedRegistryProvidersKey = 'ConnectedRegistryProviders';

export class UnifiedRegistryTreeDataProvider implements vscode.TreeDataProvider<UnifiedRegistryItem<unknown>> {
    private readonly onDidChangeTreeDataEmitter = new vscode.EventEmitter<UnifiedRegistryItem<unknown> | UnifiedRegistryItem<unknown>[] | undefined>();
    public readonly onDidChangeTreeData = this.onDidChangeTreeDataEmitter.event;

    private readonly providers = new Map<string, RegistryDataProvider<unknown>>();

    public constructor(private readonly storageMemento: vscode.Memento) {

    }

    public getTreeItem(element: UnifiedRegistryItem<unknown>): vscode.TreeItem | Thenable<vscode.TreeItem> {
        return element.provider.getTreeItem(element.wrappedItem);
    }

    public async getChildren(element?: UnifiedRegistryItem<unknown> | undefined): Promise<UnifiedRegistryItem<unknown>[]> {
        if (element) {
            const elements = await element.provider.getChildren(element.wrappedItem);

            if (!elements) {
                return [];
            }

            return elements.map(e => {
                return {
                    provider: element.provider,
                    wrappedItem: e,
                    parent: element
                };
            });
        } else {
            const unifiedRoots: UnifiedRegistryItem<unknown>[] = [];

            const connectedProviderIds = this.storageMemento.get<string[]>(ConnectedRegistryProvidersKey, []);

            for (const provider of this.providers.values()) {
                if (!connectedProviderIds.includes(provider.id)) {
                    continue;
                }

                const roots = await provider.getChildren(undefined);
                if (!roots) {
                    continue;
                }

                unifiedRoots.push(...roots.map(r => {
                    return {
                        provider,
                        wrappedItem: r,
                        parent: undefined
                    };
                }));
            }

            return unifiedRoots;
        }
    }

    public getParent(element: UnifiedRegistryItem<unknown>): UnifiedRegistryItem<unknown> | undefined {
        return element.parent;
    }

    public registerProvider(provider: RegistryDataProvider<unknown>): vscode.Disposable {
        this.providers.set(provider.id, provider);

        return {
            dispose: () => {
                this.providers.delete(provider.id);
            }
        };
    }

    public refresh(): void {
        this.onDidChangeTreeDataEmitter.fire(undefined);
    }

    public async connectRegistryProvider(provider: RegistryDataProvider<unknown> | undefined = undefined): Promise<void> {
        const connectedProviderIds = this.storageMemento.get<string[]>(ConnectedRegistryProvidersKey, []);

        if (!provider) {
            const picks: (vscode.QuickPickItem & { provider: RegistryDataProvider<unknown> })[] = [];

            for (const currentProvider of this.providers.values()) {
                if (connectedProviderIds.includes(currentProvider.id)) {
                    continue;
                }

                picks.push({
                    label: currentProvider.label,
                    description: currentProvider.description,
                    provider: currentProvider
                });
            }

            const picked = await vscode.window.showQuickPick(picks, { placeHolder: vscode.l10n.t('Select a registry provider to use') });
            if (!picked) {
                return;
            }

            provider = picked.provider;
        }

        if (!connectedProviderIds.includes(provider.id)) {
            await provider?.onConnect?.();
            const connectedProviderIdsSet: Set<string> = new Set(connectedProviderIds);
            connectedProviderIdsSet.add(provider.id);
            await this.storageMemento.update(ConnectedRegistryProvidersKey, Array.from(connectedProviderIdsSet));
        }

        this.refresh();
    }

    public async disconnectRegistryProvider(item: UnifiedRegistryItem<never>): Promise<void> {
        await item.provider?.onDisconnect?.();
        const newConnectedProviderIds = this.storageMemento
            .get<string[]>(ConnectedRegistryProvidersKey, [])
            .filter(cpi => cpi !== item.provider.id);
        await this.storageMemento.update(ConnectedRegistryProvidersKey, newConnectedProviderIds);
        this.refresh();
    }
}
