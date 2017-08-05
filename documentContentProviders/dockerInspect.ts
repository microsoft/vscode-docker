import { TextDocumentContentProvider, Uri, window, workspace } from "vscode";
import { docker } from "../commands/utils/docker-endpoint";

export const IMAGE_DOMAIN = "image";
export const SCHEME = "docker-inspect";
export const URI_EXTENSION = ".json";

export default class DockerInspectDocumentContentProvider implements TextDocumentContentProvider {
    static async openImageInspectDocument(image: Docker.ImageDesc): Promise<void> {
        const imageName: string = image.RepoTags ? image.RepoTags[0] : image.Id;
        const uri = Uri.parse(`${SCHEME}://${IMAGE_DOMAIN}/${imageName}${URI_EXTENSION}`);
        window.showTextDocument(await workspace.openTextDocument(uri));
    }

    provideTextDocumentContent({ path }: Uri): Promise<string> {
        return new Promise((resolve, reject) => {
            const imageName = path.substring(1).replace(URI_EXTENSION, "");
            docker.getImage(imageName).inspect((error: Error, imageMetadata: any) => {
                resolve(JSON.stringify(imageMetadata, null,  "    "));
            });
        });
    }
}