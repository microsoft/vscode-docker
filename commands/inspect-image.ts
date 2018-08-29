/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import DockerInspectDocumentContentProvider from "../documentContentProviders/dockerInspect";
import { ImageNode } from "../explorer/models/imageNode";
import { reporter } from "../telemetry/telemetry";
import { quickPickImage } from "./utils/quick-pick-image";

export default async function inspectImage(context?: ImageNode): Promise<void> {
    let imageToInspect: Docker.ImageDesc;

    if (context && context.imageDesc) {
        imageToInspect = context.imageDesc;
    } else {
        const selectedImage = await quickPickImage();
        imageToInspect = selectedImage.imageDesc;
    }

    await DockerInspectDocumentContentProvider.openImageInspectDocument(imageToInspect);
}
