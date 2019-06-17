/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Dockerode from 'dockerode';
import * as osNode from 'os';
import { RequestAPI, RequiredUriUrl } from 'request';
import { RequestPromise, RequestPromiseOptions } from 'request-promise-native';
import { ExtensionContext, OutputChannel, TreeView } from "vscode";
import { AzExtTreeDataProvider, AzExtTreeItem, IAzureUserInput, ITelemetryReporter } from "vscode-azureextensionui";
import { ContainersTreeItem } from './tree/containers/ContainersTreeItem';
import { ImagesTreeItem } from './tree/images/ImagesTreeItem';
import { NetworksTreeItem } from './tree/networks/NetworksTreeItem';
import { DockerHubAccountTreeItem } from './tree/registries/dockerHub/DockerHubAccountTreeItem';
import { VolumesTreeItem } from './tree/volumes/VolumesTreeItem';
import { IKeytar } from './utils/keytar';
import { ITerminalProvider } from "./utils/TerminalProvider";

type requestPromise = RequestAPI<RequestPromise, RequestPromiseOptions, RequiredUriUrl>;

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// tslint:disable-next-line: export-name
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: OutputChannel;
    export let ui: IAzureUserInput;
    export let reporter: ITelemetryReporter;
    export let terminalProvider: ITerminalProvider;
    export let keytar: IKeytar | undefined;
    export let dockerode: Dockerode;
    export let dockerodeInitError: unknown;

    export let imagesTree: AzExtTreeDataProvider;
    export let imagesTreeView: TreeView<AzExtTreeItem>;
    export let imagesRoot: ImagesTreeItem;

    export let containersTree: AzExtTreeDataProvider;
    export let containersTreeView: TreeView<AzExtTreeItem>;
    export let containersRoot: ContainersTreeItem;

    export let networksTree: AzExtTreeDataProvider;
    export let networksTreeView: TreeView<AzExtTreeItem>;
    export let networksRoot: NetworksTreeItem;

    export let registriesTree: AzExtTreeDataProvider;
    export let registriesTreeView: TreeView<AzExtTreeItem>;
    export let dockerHubAccountTreeItem: DockerHubAccountTreeItem;

    export let volumesTree: AzExtTreeDataProvider;
    export let volumesTreeView: TreeView<AzExtTreeItem>;
    export let volumesRoot: VolumesTreeItem;

    /**
     * A version of 'request-promise' which should be used for all direct request calls (it has the user agent set up properly)
     */
    export let request: requestPromise;

    /**
     * A test-injectable structure defining the current operating system and version
     */
    export let os = {
        platform: osNode.platform(),
        release: osNode.release()
    };
}
