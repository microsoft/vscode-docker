/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import * as vscode from "vscode";
import { IActionContext } from "vscode-azureextensionui";
import { ext } from "../../extensionVariables";
import { getOfficialBuildTaskForDockerfile } from "../../tasks/TaskHelper";
import { delay } from "../../utils/delay";
import { getValidImageName } from "../../utils/getValidImageName";
import { quickPickDockerFileItem } from "../../utils/quick-pick-file";
import { quickPickWorkspaceFolder } from "../../utils/quickPickWorkspaceFolder";
import { addImageTaggingTelemetry, getTagFromUserInput } from "./tagImage";

export async function buildImage(context: IActionContext, dockerFileUri: vscode.Uri | undefined): Promise<void> {
    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultContextPath = configOptions.get('imageBuildContextPath', '');

    let rootFolder: vscode.WorkspaceFolder = await quickPickWorkspaceFolder('To build Docker files you must first open a folder or workspace in VS Code.');

    const dockerFileItem = await quickPickDockerFileItem(context, dockerFileUri, rootFolder);

    const task = await getOfficialBuildTaskForDockerfile(dockerFileItem.absoluteFilePath, rootFolder);
    if (task) {
        await vscode.tasks.executeTask(task);
    } else {
        let contextPath: string = dockerFileItem.relativeFolderPath;
        if (defaultContextPath && defaultContextPath !== '') {
            contextPath = defaultContextPath;
        }
        let absFilePath: string = path.join(rootFolder.uri.fsPath, dockerFileItem.relativeFilePath);
        let dockerFileKey = `buildTag_${absFilePath}`;
        let prevImageName: string | undefined = ext.context.globalState.get(dockerFileKey);
        // Get imageName based previous entries, else on name of subfolder containing the Dockerfile
        let suggestedImageName = prevImageName || getValidImageName(dockerFileItem.absoluteFolderPath, 'latest');

        // Temporary work-around for vscode bug where valueSelection can be messed up if a quick pick is followed by a showInputBox
        await delay(500);

        addImageTaggingTelemetry(context, suggestedImageName, '.before');
        const imageName: string = await getTagFromUserInput(suggestedImageName, !prevImageName);
        addImageTaggingTelemetry(context, imageName, '.after');

        await ext.context.globalState.update(dockerFileKey, imageName);

        const terminal: vscode.Terminal = ext.terminalProvider.createTerminal('Docker');
        terminal.sendText(`docker build --rm -f "${dockerFileItem.relativeFilePath}" -t ${imageName} ${contextPath}`);
        terminal.show();
    }
}
