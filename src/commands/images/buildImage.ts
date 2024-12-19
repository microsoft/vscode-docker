/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, UserCancelledError } from "@microsoft/vscode-azext-utils";
import { quoted } from "@microsoft/vscode-container-client";
import * as path from "path";
import * as vscode from "vscode";
import { ext } from "../../extensionVariables";
import { TaskCommandRunnerFactory } from "../../runtimes/runners/TaskCommandRunnerFactory";
import { getOfficialBuildTaskForDockerfile } from "../../tasks/TaskHelper";
import { getValidImageNameFromPath } from "../../utils/getValidImageName";
import { delay } from "../../utils/promiseUtils";
import { quickPickDockerFileItem } from "../../utils/quickPickFile";
import { quickPickWorkspaceFolder } from "../../utils/quickPickWorkspaceFolder";
import { selectBuildCommand } from "../selectCommandTemplate";
import { addImageTaggingTelemetry, getTagFromUserInput } from "./tagImage";

const tagRegex: RegExp = /\$\{tag\}/i;

export async function buildImage(context: IActionContext, dockerFileUri: vscode.Uri | undefined): Promise<void> {
    if (!vscode.workspace.isTrusted) {
        throw new UserCancelledError('enforceTrust');
    }

    const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration('docker');
    const defaultContextPath = configOptions.get('imageBuildContextPath', '');

    let rootFolder: vscode.WorkspaceFolder;
    if (dockerFileUri) {
        rootFolder = vscode.workspace.getWorkspaceFolder(dockerFileUri);
    }

    rootFolder = rootFolder || await quickPickWorkspaceFolder(context, vscode.l10n.t('To build Docker files you must first open a folder or workspace in VS Code.'));

    const dockerFileItem = await quickPickDockerFileItem(context, dockerFileUri, rootFolder);
    const task = await getOfficialBuildTaskForDockerfile(context, dockerFileItem.absoluteFilePath, rootFolder);

    if (task) {
        await vscode.tasks.executeTask(task);
    } else {
        const contextPath: string = defaultContextPath || dockerFileItem.relativeFolderPath;

        const terminalCommand = await selectBuildCommand(
            context,
            rootFolder,
            dockerFileItem.relativeFilePath,
            contextPath
        );

        const getImageName = async (): Promise<string> => {
            const absFilePath: string = path.join(rootFolder.uri.fsPath, dockerFileItem.relativeFilePath);
            const dockerFileKey = `buildTag_${absFilePath}`;

            const prevImageName: string | undefined = ext.context.workspaceState.get(dockerFileKey);

            // Get imageName based previous entries, else on name of subfolder containing the Dockerfile
            const suggestedImageName = prevImageName || getValidImageNameFromPath(dockerFileItem.absoluteFolderPath, 'latest');

            // Temporary work-around for vscode bug where valueSelection can be messed up if a quick pick is followed by a showInputBox
            await delay(500);

            addImageTaggingTelemetry(context, suggestedImageName, '.before');
            const imageName: string = await getTagFromUserInput(context, suggestedImageName);
            addImageTaggingTelemetry(context, imageName, '.after');

            await ext.context.workspaceState.update(dockerFileKey, imageName);

            return imageName;
        };

        // Replace '${tag}' if needed. Tag is a special case because we don't want to prompt unless necessary, so must manually replace it.
        if (!terminalCommand.args || terminalCommand.args.length === 0) {
            // This is a customized command, so parse the tag from the command
            if (tagRegex.test(terminalCommand.command)) {
                const imageName = await getImageName();
                terminalCommand.command = terminalCommand.command.replace(tagRegex, imageName);
            }
        } else if (terminalCommand.args.some(arg => tagRegex.test(typeof (arg) === 'string' ? arg : arg.value))) {
            // This is a default command, so look for ${tag} in the args
            const imageName = await getImageName();

            terminalCommand.args = terminalCommand.args.map(arg => {
                if (typeof (arg) === 'string') {
                    if (tagRegex.test(arg)) {
                        arg = quoted(arg.replace(tagRegex, imageName));
                    }
                } else if (tagRegex.test(arg.value)) {
                    arg = quoted(arg.value.replace(tagRegex, imageName));
                }

                return arg;
            });
        }

        const client = await ext.runtimeManager.getClient();
        const taskCRF = new TaskCommandRunnerFactory({
            taskName: client.displayName,
            workspaceFolder: rootFolder,
            focus: true,
        });

        await taskCRF.getCommandRunner()(terminalCommand);
    }
}
