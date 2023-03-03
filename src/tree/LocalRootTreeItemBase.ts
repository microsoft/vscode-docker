/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtParentTreeItem, AzExtTreeItem, AzureWizard, GenericTreeItem, IActionContext, parseError } from "@microsoft/vscode-azext-utils";
import { ConfigurationTarget, l10n, ThemeColor, ThemeIcon, workspace, WorkspaceConfiguration } from "vscode";
import { showDockerInstallNotification } from "../commands/dockerInstaller";
import { configPrefix } from "../constants";
import { ext } from "../extensionVariables";
import { isCommandNotSupportedError, ListContainersItem, ListContextItem, ListImagesItem, ListNetworkItem, ListVolumeItem } from "../runtimes/docker";
import { DockerExtensionKind, getVSCodeRemoteInfo, IVSCodeRemoteInfo, RemoteKind } from "../utils/getVSCodeRemoteInfo";
import { runtimeInstallStatusProvider } from "../utils/RuntimeInstallStatusProvider";
import { DatedDockerImage } from "./images/ImagesTreeItem";
import { LocalGroupTreeItemBase } from "./LocalGroupTreeItemBase";
import { OpenUrlTreeItem } from "./OpenUrlTreeItem";
import { CommonGroupBy, CommonProperty, CommonSortBy, sortByProperties } from "./settings/CommonProperties";
import { ITreeArraySettingInfo, ITreeSettingInfo } from "./settings/ITreeSettingInfo";
import { ITreeSettingsWizardContext, ITreeSettingWizardInfo } from "./settings/ITreeSettingsWizardContext";
import { TreeSettingListStep } from "./settings/TreeSettingListStep";
import { TreeSettingStep } from "./settings/TreeSettingStep";
import { TreePrefix } from "./TreePrefix";

type DockerStatus = 'NotInstalled' | 'Installed' | 'Running';

export type AnyContainerObject =
    ListContainersItem |
    (ListImagesItem & { name?: undefined }) | // Pretend `ListImagesItem` has some always-undefined extra properties to keep TS happy
    ListNetworkItem |
    (ListVolumeItem & { id?: undefined }) | // Pretend `ListVolumeItem` has some always-undefined extra properties to keep TS happy
    (ListContextItem & { id?: undefined, createdAt?: undefined }); // Pretend `ListContextItem` has some always-undefined extra properties to keep TS happy

export type LocalChildType<T extends AnyContainerObject> = new (parent: AzExtParentTreeItem, item: T) => AzExtTreeItem & { createdTime: number; size?: number };
export type LocalChildGroupType<TItem extends AnyContainerObject, TProperty extends string | CommonProperty> = new (parent: LocalRootTreeItemBase<TItem, TProperty>, group: string, items: TItem[]) => LocalGroupTreeItemBase<TItem, TProperty>;

const groupByKey: string = 'groupBy';
const sortByKey: string = 'sortBy';
export const labelKey: string = 'label';
export const descriptionKey: string = 'description';
let dockerInstallNotificationShownToUser: boolean = false;

export abstract class LocalRootTreeItemBase<TItem extends AnyContainerObject, TProperty extends string | CommonProperty> extends AzExtParentTreeItem {
    public abstract labelSettingInfo: ITreeSettingInfo<TProperty>;
    public abstract descriptionSettingInfo: ITreeArraySettingInfo<TProperty>;
    public abstract groupBySettingInfo: ITreeSettingInfo<TProperty | CommonGroupBy>;
    public sortBySettingInfo: ITreeSettingInfo<CommonSortBy> = {
        properties: [...sortByProperties],
        defaultProperty: 'CreatedTime',
    };

    public abstract treePrefix: TreePrefix;
    public abstract configureExplorerTitle: string;
    public abstract childType: LocalChildType<TItem>;
    public abstract childGroupType: LocalChildGroupType<TItem, TProperty>;

    public abstract getItems(context: IActionContext): Promise<TItem[] | undefined>;
    public abstract getPropertyValue(item: TItem, property: TProperty): string;

    // Redefining this as an abstract allows inheriting classes to either do an accessor or a property
    public readonly abstract childTypeLabel: string;

    public static autoRefreshViews: boolean = true;

    public groupBySetting: TProperty | CommonGroupBy;
    public sortBySetting: CommonSortBy;
    public labelSetting: TProperty;
    public descriptionSetting: TProperty[];
    protected failedToConnect: boolean = false;

    private _currentItems: TItem[] | undefined;
    private _cachedItems: TItem[] | undefined;
    private _currentDockerStatus: DockerStatus;

    public get contextValue(): string {
        return this.treePrefix;
    }

    public get config(): WorkspaceConfiguration {
        return workspace.getConfiguration(`${configPrefix}.${this.treePrefix}`);
    }

    protected getTreeItemForEmptyList(): AzExtTreeItem[] {
        return [new GenericTreeItem(this, {
            label: l10n.t('No items found'),
            iconPath: new ThemeIcon('info'),
            contextValue: 'dockerNoItems'
        })];
    }

    public async loadMoreChildrenImpl(clearCache: boolean, context: IActionContext): Promise<AzExtTreeItem[]> {
        try {
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.activityMeasurementService.recordActivity('overallnoedit');

            this._currentItems = await this.getCachedItems(context, clearCache);
            this.failedToConnect = false;
            this._currentDockerStatus = 'Running';
        } catch (error) {
            this._currentItems = undefined;
            this.failedToConnect = true;
            context.telemetry.properties.failedToConnect = 'true';

            if (!this._currentDockerStatus) {
                this._currentDockerStatus = await runtimeInstallStatusProvider.isRuntimeInstalled() ? 'Installed' : 'NotInstalled';
            }

            this.showDockerInstallNotificationIfNeeded();
            return await this.getDockerErrorTreeItems(context, error, this._currentDockerStatus === 'Installed');
        }

        if (this._currentItems.length === 0) {
            context.telemetry.properties.noItems = 'true';
            return this.getTreeItemForEmptyList();
        } else {
            this.groupBySetting = this.getTreeSetting(groupByKey, this.groupBySettingInfo);
            context.telemetry.properties.groupBySetting = this.groupBySetting;
            this.sortBySetting = this.getTreeSetting(sortByKey, this.sortBySettingInfo);
            context.telemetry.properties.sortBySetting = this.sortBySetting;
            this.labelSetting = this.getTreeSetting(labelKey, this.labelSettingInfo);
            context.telemetry.properties.labelSetting = this.labelSetting;
            this.descriptionSetting = this.getTreeArraySetting(descriptionKey, this.descriptionSettingInfo);
            context.telemetry.properties.descriptionSetting = this.descriptionSetting.toString();

            return this.groupItems(this._currentItems);
        }
    }

    public hasMoreChildrenImpl(): boolean {
        return false;
    }

    public compareChildrenImpl(ti1: AzExtTreeItem, ti2: AzExtTreeItem): number {
        if (this.failedToConnect) {
            return 0; // children are already sorted
        } else {
            if (ti1 instanceof this.childGroupType && ti2 instanceof this.childGroupType) {
                if (this.groupBySetting === 'CreatedTime' && ti2.maxCreatedTime !== ti1.maxCreatedTime) {
                    return ti2.maxCreatedTime - ti1.maxCreatedTime;
                }
            } else if (ti1 instanceof this.childType && ti2 instanceof this.childType) {
                if (this.sortBySetting === 'CreatedTime' && ti2.createdTime !== ti1.createdTime) {
                    return ti2.createdTime - ti1.createdTime;
                } else if (this.sortBySetting === 'Size' && ti1.size !== undefined && ti2.size !== undefined) {
                    return ti2.size - ti1.size;
                }
            }

            return super.compareChildrenImpl(ti1, ti2);
        }
    }

    private async groupItems(items: TItem[]): Promise<AzExtTreeItem[]> {
        let itemsWithNoGroup: TItem[] = [];
        const groupMap = new Map<string, TItem[]>();

        if (this.groupBySetting === 'None') {
            itemsWithNoGroup = items;
        } else {
            for (const item of items) {
                const groupName: string | undefined = this.getPropertyValue(item, this.groupBySetting);
                if (!groupName) {
                    itemsWithNoGroup.push(item);
                } else {
                    const groupedItems = groupMap.get(groupName);
                    if (groupedItems) {
                        groupedItems.push(item);
                    } else {
                        groupMap.set(groupName, [item]);
                    }
                }
            }
        }

        return await this.createTreeItemsWithErrorHandling(
            [...itemsWithNoGroup, ...groupMap.entries()],
            'invalidLocalItemOrGroup',
            itemOrGroup => {
                if (Array.isArray(itemOrGroup)) {
                    const [groupName, groupedItems] = itemOrGroup;
                    return new this.childGroupType(this, groupName, groupedItems);
                } else {
                    return new this.childType(this, itemOrGroup);
                }
            },
            itemOrGroup => {
                if (Array.isArray(itemOrGroup)) {
                    const [group] = itemOrGroup;
                    return group;
                } else {
                    return getTreeId(itemOrGroup);
                }
            }
        );
    }

    public getTreeItemLabel(item: TItem): string {
        return this.getPropertyValue(item, this.labelSetting);
    }

    public getTreeItemDescription(item: TItem): string {
        const values: string[] = this.descriptionSetting.map(prop => this.getPropertyValue(item, prop));
        return values.join(' - ');
    }

    public getTreeSetting<T extends string>(setting: string, settingInfo: ITreeSettingInfo<T>): T {
        const value = this.config.get<T>(setting);
        if (value && settingInfo.properties.find(propInfo => propInfo.property === value)) {
            return value;
        } else {
            return settingInfo.defaultProperty;
        }
    }

    public getTreeArraySetting<T extends string>(setting: string, settingInfo: ITreeArraySettingInfo<T>): T[] {
        const value = this.config.get<T[]>(setting);
        if (Array.isArray(value) && value.every(v1 => !!settingInfo.properties.find(v2 => v1 === v2.property))) {
            return value;
        } else {
            return settingInfo.defaultProperty;
        }
    }

    public getSettingWizardInfoList(): ITreeSettingWizardInfo[] {
        return [
            {
                label: l10n.t('Label'),
                setting: labelKey,
                currentValue: this.labelSetting,
                description: l10n.t('The primary property to display.'),
                settingInfo: this.labelSettingInfo
            },
            {
                label: l10n.t('Description'),
                setting: descriptionKey,
                currentValue: this.descriptionSetting,
                description: l10n.t('Any secondary properties to display.'),
                settingInfo: this.descriptionSettingInfo
            },
            {
                label: l10n.t('Group By'),
                setting: groupByKey,
                currentValue: this.groupBySetting,
                description: l10n.t('The property used for grouping.'),
                settingInfo: this.groupBySettingInfo
            },
            {
                label: l10n.t('Sort By'),
                setting: sortByKey,
                currentValue: this.sortBySetting,
                description: l10n.t('The property used for sorting.'),
                settingInfo: this.sortBySettingInfo
            },
        ];
    }

    public async configureExplorer(context: IActionContext): Promise<void> {
        const infoList = this.getSettingWizardInfoList();
        const wizardContext: ITreeSettingsWizardContext = { infoList, ...context };
        const wizard = new AzureWizard(wizardContext, {
            title: this.configureExplorerTitle,
            promptSteps: [
                new TreeSettingListStep(),
                new TreeSettingStep()
            ],
            hideStepCount: true
        });
        await wizard.prompt();
        await wizard.execute();

        if (wizardContext.info) {
            // TODO: Should this be awaited?
            /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
            this.config.update(wizardContext.info.setting, wizardContext.newValue, ConfigurationTarget.Global);
        } else {
            // reset settings
            for (const info of infoList) {
                // TODO: Should this be awaited?
                /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
                this.config.update(info.setting, undefined, ConfigurationTarget.Global);
            }
        }
    }

    private async getDockerErrorTreeItems(context: IActionContext, error: unknown, dockerInstalled: boolean): Promise<AzExtTreeItem[]> {
        const parsedError = parseError(error);
        if (isCommandNotSupportedError(error)) {
            return [new GenericTreeItem(this, { label: l10n.t('This view is not supported in the current context.'), contextValue: 'contextNotSupported' })];
        } else if (parsedError.isUserCancelledError) {
            return [new GenericTreeItem(this, { label: l10n.t('Changing context...'), contextValue: 'changingContexts' })];
        }

        const result: AzExtTreeItem[] = dockerInstalled
            ? [
                new GenericTreeItem(this, { label: l10n.t('Failed to connect. Is {0} running?', (await ext.runtimeManager.getClient()).displayName), contextValue: 'connectionError', iconPath: new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground')) }),
                new GenericTreeItem(this, { label: l10n.t('  Error: {0}', parsedError.message), contextValue: 'connectionError' }),
                new OpenUrlTreeItem(this, l10n.t('Additional Troubleshooting...'), 'https://aka.ms/AA37qt2')
            ]
            : [new GenericTreeItem(this, { label: l10n.t('Failed to connect. Is {0} installed?', (await ext.runtimeManager.getClient()).displayName), contextValue: 'connectionError', iconPath: new ThemeIcon('warning', new ThemeColor('problemsWarningIcon.foreground')) })];

        const remoteInfo: IVSCodeRemoteInfo = getVSCodeRemoteInfo(context);
        if (remoteInfo.extensionKind === DockerExtensionKind.workspace && remoteInfo.remoteKind === RemoteKind.devContainer) {
            const ti = new OpenUrlTreeItem(this, l10n.t('Running Docker in a dev container...'), 'https://aka.ms/AA5xva6');
            result.push(ti);
        }

        return result;
    }

    private async getCachedItems(context: IActionContext, clearCache: boolean): Promise<TItem[]> {
        if (clearCache || !this._cachedItems) {
            if (ext.treeInitError === undefined) {
                const items: TItem[] = await this.getItems(context) || [];
                this._cachedItems = items.sort((a, b) => getTreeId(a).localeCompare(getTreeId(b)));
            } else {
                throw ext.treeInitError;
            }
        }

        return this._cachedItems;
    }

    private showDockerInstallNotificationIfNeeded(): void {
        if (!dockerInstallNotificationShownToUser && this._currentDockerStatus === 'NotInstalled') {
            dockerInstallNotificationShownToUser = true;
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            showDockerInstallNotification();
        }
    }
}

export function getTreeId(object: AnyContainerObject): string {
    const objectName = object.name || (object as ListImagesItem).image?.originalName || '<none>';
    // Several of these aren't defined for all Docker objects, but the concatenation of whatever exists among them is enough to always be unique
    // *and* change the ID when the state of the object changes
    return `${object.id}${objectName}${(object as ListContainersItem).state}${(object as ListContextItem).current}${(object as DatedDockerImage).outdated}`;
}
