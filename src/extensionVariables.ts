/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as Dockerode from 'dockerode';
import * as osNode from 'os';
import { ExtensionContext, TreeView } from "vscode";
import { AzExtTreeDataProvider, AzExtTreeItem, IAzExtOutputChannel, IAzureUserInput, ITelemetryReporter } from "vscode-azureextensionui";
import { ContainersTreeItem } from './tree/containers/ContainersTreeItem';
import { ImagesTreeItem } from './tree/images/ImagesTreeItem';
import { NetworksTreeItem } from './tree/networks/NetworksTreeItem';
import { RegistriesTreeItem } from './tree/registries/RegistriesTreeItem';
import { VolumesTreeItem } from './tree/volumes/VolumesTreeItem';
import { IKeytar } from './utils/keytar';
import { ITerminalProvider } from "./utils/TerminalProvider";

/**
 * Namespace for common variables used throughout the extension. They must be initialized in the activate() method of extension.ts
 */
// tslint:disable-next-line: export-name
export namespace ext {
    export let context: ExtensionContext;
    export let outputChannel: IAzExtOutputChannel;
    export let ui: IAzureUserInput;
    export let reporter: ITelemetryReporter;
    export let terminalProvider: ITerminalProvider;
    export let keytar: IKeytar | undefined;
    export let dockerode: Dockerode;
    export let dockerodeInitError: unknown;
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

    /**
     * A test-injectable structure defining the current operating system and version
     */
    export let os = {
        platform: osNode.platform(),
        release: osNode.release()
    };
}
