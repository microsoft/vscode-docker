/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { configurationKeys } from '../constants';
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

const teleCmdId: string = 'vscode-docker.image.tag';

export async function tagImage(context?: IHasImageDescriptorAndLabel): Promise<string> {

    let [imageToTag, name] = await getOrAskForImageAndTag(context);

    if (imageToTag) {

        let imageWithTag: string = await getTagFromUserInput(name, true);
        let repo: string = imageWithTag;
        let tag: string = 'latest';

        if (imageWithTag.lastIndexOf(':') > 0) {
            repo = imageWithTag.slice(0, imageWithTag.lastIndexOf(':'));
            tag = imageWithTag.slice(imageWithTag.lastIndexOf(':') + 1);
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
        return imageWithTag;
    }
}

export async function getTagFromUserInput(imageName: string, addRegistry: boolean): Promise<string> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultRegistryPath = configOptions.get(configurationKeys.defaultRegistryPath, '');

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        prompt: 'Tag image as...',
    };
    if (addRegistry) {
        let registryLength: number = imageName.indexOf('/');
        if (defaultRegistryPath.length > 0 && registryLength < 0) {
            imageName = defaultRegistryPath + '/' + imageName;
            registryLength = defaultRegistryPath.length;
        }
        opt.valueSelection = [0, registryLength + 1];  //include the '/'
    }

    opt.placeHolder = imageName;
    opt.value = imageName;

    const nameWithTag: string = await ext.ui.showInputBox(opt);
    return nameWithTag;
}

export interface IHasImageDescriptorAndLabel {
    imageDesc: Docker.ImageDesc,
    label: string
}

export async function getOrAskForImageAndTag(context?: IHasImageDescriptorAndLabel): Promise<[Docker.ImageDesc, string]> {
    let name: string;
    let description: Docker.ImageDesc;

    if (context && context.imageDesc) {
        description = context.imageDesc;
        name = context.label;
    } else {
        const selectedItem: ImageItem = await quickPickImage(false);
        if (selectedItem) {
            description = selectedItem.imageDesc
            name = selectedItem.label;
        }

    }

    return [description, name];
}
