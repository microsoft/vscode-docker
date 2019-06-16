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
import { DockerHubAccountTreeItem } from './tree/registries/dockerHub/DockerHubAccountTreeItem';
import { IKeytar } from './utils/keytar';
import { ITerminalProvider } from "./utils/TerminalProvider";

type requestPromise = RequestAPI<RequestPromise, RequestPromiseOptions, RequiredUriUrl>;

export enum ImageGrouping {
    None,
    Repository,
    RepositoryName,
    ImageId
}
export const DefaultImageGrouping = ImageGrouping.Repository;

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: OutputChannel;
    export let ui: IAzureUserInput;
    export let reporter: ITelemetryReporter;
    export let terminalProvider: ITerminalProvider;
    export let keytar: IKeytar | undefined;
    export let dockerode: Dockerode;

    export let imagesTree: AzExtTreeDataProvider;
    export let imagesTreeView: TreeView<AzExtTreeItem>;

    export let containersTree: AzExtTreeDataProvider;
    export let containersTreeView: TreeView<AzExtTreeItem>;

    export let networksTree: AzExtTreeDataProvider;
    export let networksTreeView: TreeView<AzExtTreeItem>;

    export let registriesTree: AzExtTreeDataProvider;
    export let registriesTreeView: TreeView<AzExtTreeItem>;
    export let dockerHubAccountTreeItem: DockerHubAccountTreeItem;

    export let volumesTree: AzExtTreeDataProvider;
    export let volumesTreeView: TreeView<AzExtTreeItem>;

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

    export let groupImagesBy: ImageGrouping = ImageGrouping.ImageId;
}
