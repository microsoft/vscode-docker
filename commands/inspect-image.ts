import { ImageNode } from "../explorer/models/imageNode";
import DockerInspectDocumentContentProvider from "../documentContentProviders/dockerInspect";
import { quickPickImage } from "./utils/quick-pick-image";
import { reporter } from "../telemetry/telemetry";

export default async function inspectImage(context?: ImageNode) {

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
        reporter && reporter.sendTelemetryEvent("command", { command: "vscode-docker.image.inspect" });
    }
};