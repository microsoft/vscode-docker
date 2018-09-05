/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { IActionContext } from 'vscode-azureextensionui';
import { configurationKeys } from '../constants';
import { ImageNode } from '../explorer/models/imageNode';
import { RootNode } from '../explorer/models/rootNode';
import { delay } from '../explorer/utils/utils';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

const teleCmdId: string = 'vscode-docker.image.tag';

export async function tagImage(actionContext: IActionContext, context: ImageNode | RootNode | IHasImageDescriptorAndLabel | undefined): Promise<string> {
    // If a RootNode or no node is passed in, we ask the user to pick an image
    let [imageToTag, currentName] = await getOrAskForImageAndTag(actionContext, context instanceof RootNode ? undefined : context);

    if (imageToTag) {
        addImageTaggingTelemetry(actionContext, currentName, '.before');
        let newTaggedName: string = await getTagFromUserInput(currentName, true);
        addImageTaggingTelemetry(actionContext, newTaggedName, '.after');

        let repo: string = newTaggedName;
        let tag: string = 'latest';

        if (newTaggedName.lastIndexOf(':') > 0) {
            repo = newTaggedName.slice(0, newTaggedName.lastIndexOf(':'));
            tag = newTaggedName.slice(newTaggedName.lastIndexOf(':') + 1);
        }

        const image: Docker.Image = docker.getImage(imageToTag.Id);

        // tslint:disable-next-line:no-function-expression // Grandfathered in
        image.tag({ repo: repo, tag: tag }, function (err: { message?: string }, data: any): void {
            if (err) {
                // TODO: use parseError, proper error handling
                vscode.window.showErrorMessage('Docker Tag error: ' + err.message);
            }
        });

        if (reporter) {
            /* __GDPR__
               "command" : {
                  "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
               }
             */
            reporter.sendTelemetryEvent('command', {
                command: teleCmdId
            });
        }
        return newTaggedName;
    }
}

export async function getTagFromUserInput(imageName: string, addDefaultRegistry: boolean): Promise<string> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultRegistryPath = configOptions.get(configurationKeys.defaultRegistryPath, '');

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Tag image as...',
    };
    if (addDefaultRegistry) {
        let registryLength: number = imageName.indexOf('/');
        if (defaultRegistryPath.length > 0 && registryLength < 0) {
            imageName = defaultRegistryPath + '/' + imageName;
            registryLength = defaultRegistryPath.length;
        }
        opt.valueSelection = registryLength < 0 ? undefined : [0, registryLength + 1];  //include the '/'
    }

    opt.value = imageName;

    const nameWithTag: string = await ext.ui.showInputBox(opt);
    return nameWithTag;
}

export interface IHasImageDescriptorAndLabel {
    imageDesc: Docker.ImageDesc,
    label: string
}

export async function getOrAskForImageAndTag(actionContext: IActionContext, context: IHasImageDescriptorAndLabel | undefined): Promise<[Docker.ImageDesc, string]> {
    let name: string;
    let description: Docker.ImageDesc;

    if (context && context.imageDesc) {
        description = context.imageDesc;
        name = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage(actionContext, false);
        if (selectedItem) {
            description = selectedItem.imageDesc
            name = selectedItem.label;
        }

        // Temporary work-around for vscode bug where valueSelection can be messed up if a quick pick is followed by a showInputBox
        await delay(500);
    }

    return [description, name];
}

const KnownRegistries: { type: string, regex: RegExp }[] = [
    // Like username/path
    { type: 'dockerhub-namespace', regex: /^[^.:]+\/[^.:]+\/$/ },

    { type: 'dockerhub-dockerio', regex: /^docker.io.*\// },
    { type: 'gitlab', regex: /gitlab.*\// },
    { type: 'ACR', regex: /azurecr\.io.*\// },
    { type: 'GCR', regex: /gcr\.io.*\// },
    { type: 'ECR', regex: /\.ecr\..*\// },
    { type: 'localhost', regex: /localhost:.*\// },

    // Has a port, probably a private registry
    { type: 'privateWithPort', regex: /:[0-9]+\// },

    // Match anything remaining
    { type: 'other', regex: /\// }, // has a slash
    { type: 'none', regex: /./ } // no slash
];

export function addImageTaggingTelemetry(actionContext: IActionContext, fullImageName: string, propertyPostfix: '.before' | '.after' | ''): void {
    try {
        let defaultRegistryPath: string = vscode.workspace.getConfiguration('docker').get('defaultRegistryPath', '');
        let properties: {
            numSlashes?: string;
            hasTag?: string;
            isDefaultRegistryPathSet?: string; // docker.defaultRegistryPath has a value
            isDefaultRegistryPathInName?: string;  // image name starts with defaultRegistryPath
            safeTag?: string;
            registryType?: string;
        } = {};

        let [repository, tag] = extractRegExGroups(fullImageName, /^(.*):(.*)$/, [fullImageName, '']);

        if (!!tag.match(/^[0-9.-]*(|alpha|beta|latest|edge|v|version)?[0-9.-]*$/)) {
            properties.safeTag = tag
        }
        properties.hasTag = String(!!tag);
        properties.numSlashes = String(numberMatches(repository.match(/\//g)));
        properties.isDefaultRegistryPathInName = String(repository.startsWith(`${defaultRegistryPath}/`));
        properties.isDefaultRegistryPathSet = String(!!defaultRegistryPath);

        let knownRegistry = KnownRegistries.find(kr => !!repository.match(kr.regex));
        properties.registryType = knownRegistry.type;

        for (let propertyName of Object.getOwnPropertyNames(properties)) {
            actionContext.properties[propertyName + propertyPostfix] = properties[propertyName];
        }
    } catch (error) {
        console.error(error);
    }
}

function numberMatches(matches: RegExpMatchArray | null): number {
    return matches ? matches.length : 0;
}

function extractRegExGroups(input: string, regex: RegExp, defaults: string[]): string[] {
    let matches = input.match(regex);
    if (matches) {
        // Ignore first item, which is the text of the entire match
        let [, ...groups] = matches;
        return groups;
    }

    return defaults;
}
