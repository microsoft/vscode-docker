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
