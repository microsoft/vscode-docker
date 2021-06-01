
import { ext } from "../../extensionVariables";
import { IActionContext } from 'vscode-azureextensionui';

export async function showDanglingImages(context: IActionContext): Promise<void> {
    const conf: boolean = await ext.context.globalState.get('vscode-docker.images.showDanglingImages', false);
    await ext.context.globalState.update('vscode-docker.images.showDanglingImages', !conf);
}
