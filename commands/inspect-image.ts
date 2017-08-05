import DockerInspectDocumentContentProvider from "../documentContentProviders/dockerInspect";
import { quickPickImage } from "./utils/quick-pick-image";
import { reporter } from "../telemetry/telemetry";

export default async function inspectImage() {
    const selectedImage = await quickPickImage();
    if (selectedImage) {
        await DockerInspectDocumentContentProvider.openImageInspectDocument(selectedImage.imageDesc);
        reporter && reporter.sendTelemetryEvent("command", { command: "vscode-docker.image.inspect" });
    }
};