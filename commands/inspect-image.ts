import { DockerNode } from "../explorer/dockerExplorer";
import DockerInspectDocumentContentProvider from "../documentContentProviders/dockerInspect";
import { quickPickImage } from "./utils/quick-pick-image";
import { reporter } from "../telemetry/telemetry";

export default async function inspectImage(context?: DockerNode) {

    let imageToInspect: Docker.ImageDesc;

    if (context) {
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