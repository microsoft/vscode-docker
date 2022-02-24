/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzExtTreeDataProvider, AzExtTreeItem, IAzExtOutputChannel, IExperimentationServiceAdapter } from "@microsoft/vscode-azext-utils";
import { ExtensionContext, TreeView } from "vscode";
import { ContextManager } from './docker/ContextManager';
import { DockerApiClient } from './docker/DockerApiClient';
import { IActivityMeasurementService } from './telemetry/ActivityMeasurementService';
import { ContainersTreeItem } from './tree/containers/ContainersTreeItem';
import { ContextsTreeItem } from './tree/contexts/ContextsTreeItem';
import { ImagesTreeItem } from './tree/images/ImagesTreeItem';
import { NetworksTreeItem } from './tree/networks/NetworksTreeItem';
import { RegistriesTreeItem } from './tree/registries/RegistriesTreeItem';
import { VolumesTreeItem } from './tree/volumes/VolumesTreeItem';

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// eslint-disable-next-line @typescript-eslint/no-namespace
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: IAzExtOutputChannel;

    export let experimentationService: IExperimentationServiceAdapter;
    export let activityMeasurementService: IActivityMeasurementService;

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
}
