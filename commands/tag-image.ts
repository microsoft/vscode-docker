/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import vscode = require('vscode');
import { ext } from '../extensionVariables';
import { reporter } from '../telemetry/telemetry';
import { docker } from './utils/docker-endpoint';
import { ImageItem, quickPickImage } from './utils/quick-pick-image';

const teleCmdId: string = 'vscode-docker.image.tag';

export async function tagImage(context?: DockerodeImageDescriptor): Promise<string> {

    let descriptor = await contextToImageDescriptor(context);
    let imageToTag: Docker.ImageDesc = descriptor[0];
    let name: string = descriptor[1];

    if (imageToTag) {

        let imageWithTag: string = await getTagFromUserInput(name);
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

export async function getTagFromUserInput(imageName: string): Promise<string> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultRegistryPath = configOptions.get('defaultRegistryPath', '');

    let HighlightEnd = imageName.indexOf('/');
    if (defaultRegistryPath.length > 0 && HighlightEnd < 0) {
        imageName = defaultRegistryPath + '/' + imageName;
        HighlightEnd = defaultRegistryPath.length;
    }

    let opt: vscode.InputBoxOptions = {
        ignoreFocusOut: true,
        placeHolder: imageName,
        prompt: 'Tag image as...',
        value: imageName,
        valueSelection: [0, HighlightEnd + 1]  //include the '/'
    };

    const nameWithTag: string = await ext.ui.showInputBox(opt);
    return nameWithTag;
}

export interface DockerodeImageDescriptor {
    imageDesc: Docker.ImageDesc,
    label: string
}

export async function contextToImageDescriptor(context?: DockerodeImageDescriptor): Promise<[Docker.ImageDesc, string]> {
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
