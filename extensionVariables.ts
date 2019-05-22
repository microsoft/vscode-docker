/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as osNode from 'os';
import { RequestAPI, RequiredUriUrl } from 'request';
import { RequestPromise, RequestPromiseOptions } from 'request-promise-native';
import { ExtensionContext, OutputChannel } from "vscode";
import { IAzureUserInput, ITelemetryReporter } from "vscode-azureextensionui";
import { ITerminalProvider } from "./commands/utils/TerminalProvider";
import { DockerExplorerProvider } from './explorer/dockerExplorerProvider';
import { IKeytar } from './src/utils/keytar';

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
    export let dockerExplorerProvider: DockerExplorerProvider;

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
