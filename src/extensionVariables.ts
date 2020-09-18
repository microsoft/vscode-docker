/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ExtensionContext, TreeView } from "vscode";
import { AzExtTreeDataProvider, AzExtTreeItem, IAzExtOutputChannel, IAzureUserInput } from "vscode-azureextensionui";
import { ContextManager } from './docker/ContextManager';
import { DockerApiClient } from './docker/DockerApiClient';
import { IActivityMeasurementService } from './telemetry/ActivityMeasurementService';
import { IExperimentationServiceAdapter } from './telemetry/ExperimentationServiceAdapter';
import { ContainersTreeItem } from './tree/containers/ContainersTreeItem';
import { ContextsTreeItem } from './tree/contexts/ContextsTreeItem';
import { ImagesTreeItem } from './tree/images/ImagesTreeItem';
import { NetworksTreeItem } from './tree/networks/NetworksTreeItem';
import { RegistriesTreeItem } from './tree/registries/RegistriesTreeItem';
import { VolumesTreeItem } from './tree/volumes/VolumesTreeItem';
import { IKeytar } from './utils/keytar';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// tslint:disable-next-line: export-name
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: IAzExtOutputChannel;
    export let ui: IAzureUserInput;

    export let telemetryOptIn: boolean;
    export let experimentationService: IExperimentationServiceAdapter;
    export let activityMeasurementService: IActivityMeasurementService;

    export let keytar: IKeytar | undefined;
    export let dockerContextManager: ContextManager;
    export let dockerClient: DockerApiClient;
    export let treeInitError: unknown;
    export const ignoreBundle = !/^(false|0)?$/i.test(process.env.AZCODE_DOCKER_IGNORE_BUNDLE || '');

    export let imagesTree: AzExtTreeDataProvider;
    export let imagesTreeView: TreeView<AzExtTreeItem>;
    export let imagesRoot: ImagesTreeItem;

    export let containersTree: AzExtTreeDataProvider;
    export let containersTreeView: TreeView<AzExtTreeItem>;
    export let containersRoot: ContainersTreeItem;

    export let networksTree: AzExtTreeDataProvider;
    export let networksTreeView: TreeView<AzExtTreeItem>;
    export let networksRoot: NetworksTreeItem;

    export const prefix: string = 'docker';

    export let registriesTree: AzExtTreeDataProvider;
    export let registriesTreeView: TreeView<AzExtTreeItem>;
    export let registriesRoot: RegistriesTreeItem;

    export let volumesTree: AzExtTreeDataProvider;
    export let volumesTreeView: TreeView<AzExtTreeItem>;
    export let volumesRoot: VolumesTreeItem;

    export let contextsTree: AzExtTreeDataProvider;
    export let contextsTreeView: TreeView<AzExtTreeItem>;
    export let contextsRoot: ContextsTreeItem;

    export let runningTests: boolean = false;
}
