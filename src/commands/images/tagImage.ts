/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { ext } from '../../extensionVariables';
import { localize } from '../../localize';
import { ImageTreeItem } from '../../tree/images/ImageTreeItem';
import { RegistryTreeItemBase } from '../../tree/registries/RegistryTreeItemBase';
import { extractRegExGroups } from '../../utils/extractRegExGroups';

export async function tagImage(context: IActionContext, node?: ImageTreeItem, registry?: RegistryTreeItemBase): Promise<string> {
    if (!node) {
        await ext.imagesTree.refresh();
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.tag.noImages', 'No images are available to tag')
        });
    }

    addImageTaggingTelemetry(context, node.fullTag, '.before');
    const newTaggedName: string = await getTagFromUserInput(node.fullTag, registry?.baseImagePath);
    addImageTaggingTelemetry(context, newTaggedName, '.after');

    await ext.dockerClient.tagImage(context, node.imageId, newTaggedName);
    return newTaggedName;
}

export async function getTagFromUserInput(fullTag: string, baseImagePath?: string): Promise<string> {
    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: localize('vscode-docker.commands.images.tag.tagAs', 'Tag image as...'),
    };

    if (fullTag.includes('/')) {
        opt.valueSelection = [0, fullTag.lastIndexOf('/')];
    } else if (baseImagePath) {
        fullTag = `${baseImagePath}/${fullTag}`;
        opt.valueSelection = [0, fullTag.lastIndexOf('/')];
    }

    opt.value = fullTag;

    return await ext.ui.showInputBox(opt);
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

export function addImageTaggingTelemetry(context: IActionContext, fullImageName: string, propertyPostfix: '.before' | '.after' | ''): void {
    try {
        let defaultRegistryPath: string = vscode.workspace.getConfiguration('docker').get('defaultRegistryPath', '');
        let properties: TelemetryProperties = {};

        let [repository, tag] = extractRegExGroups(fullImageName, /^(.*):(.*)$/, [fullImageName, '']);

        if (!!tag.match(/^[0-9.-]*(|alpha|beta|latest|edge|v|version)?[0-9.-]*$/)) {
            properties.safeTag = tag
        }
        properties.hasTag = String(!!tag);
        properties.numSlashes = String(numberMatches(repository.match(/\//g)));
        properties.isDefaultRegistryPathInName = String(repository.startsWith(`${defaultRegistryPath}/`));
        properties.isDefaultRegistryPathSet = String(!!defaultRegistryPath);

        let knownRegistry = KnownRegistries.find(kr => !!repository.match(kr.regex));
        if (knownRegistry) {
            properties.registryType = knownRegistry.type;
        }

        for (let propertyName of Object.keys(properties)) {
            context.telemetry.properties[propertyName + propertyPostfix] = properties[propertyName];
        }
    } catch (error) {
        console.error(error);
    }
}

function numberMatches(matches: RegExpMatchArray | null): number {
    return matches ? matches.length : 0;
}
