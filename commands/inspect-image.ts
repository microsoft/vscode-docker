/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "vscode-azureextensionui";
import DockerInspectDocumentContentProvider from "../documentContentProviders/dockerInspect";
import { ImageNode } from "../explorer/models/imageNode";
import { reporter } from "../telemetry/telemetry";
import { quickPickImage } from "./utils/quick-pick-image";

export default async function inspectImage(actionContext: IActionContext, context: ImageNode | undefined): Promise<void> {

    let imageToInspect: Docker.ImageDesc;

    if (context && context.imageDesc) {
        imageToInspect = context.imageDesc;
    } else {
        const selectedImage = await quickPickImage(actionContext);
        if (selectedImage) {
            imageToInspect = selectedImage.imageDesc;
        }
    }

    if (imageToInspect) {
        await DockerInspectDocumentContentProvider.openImageInspectDocument(imageToInspect);

        if (reporter) {
            /* __GDPR__
            "command" : {
                "command" : { "classification": "SystemMetaData", "purpose": "FeatureInsight" }
            }
            */
            reporter.sendTelemetryEvent("command", { command: "vscode-docker.image.inspect" });
        }
    }
}
