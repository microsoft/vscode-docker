/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import DockerInspectDocumentContentProvider from "../documentContentProviders/dockerInspect";
import { ImageNode } from "../explorer/models/imageNode";
import { quickPickImage } from "./utils/quick-pick-image";

export default async function inspectImage(context: IActionContext, node: ImageNode | undefined): Promise<void> {

    let imageToInspect: Docker.ImageDesc;

    if (node && node.imageDesc) {
        imageToInspect = node.imageDesc;
    } else {
        const selectedImage = await quickPickImage(context);
        if (selectedImage) {
            imageToInspect = selectedImage.imageDesc;
        }
    }

    if (imageToInspect) {
        await DockerInspectDocumentContentProvider.openImageInspectDocument(imageToInspect);
    }
}
