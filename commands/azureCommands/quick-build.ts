import * as vscode from "vscode";
import { IActionContext } from 'vscode-azureextensionui';
import { scheduleRunRequest } from '../utils/SourceArchiveUtility';

// Prompts user to select a subscription, resource group, then registry from drop down. If there are multiple folders in the workspace, the source folder must also be selected.
// The user is then asked to name & tag the image. A build is queued for the image in the selected registry.
// Selected source code must contain a path to the desired dockerfile.
export async function quickBuild(actionContext: IActionContext, dockerFileUri?: vscode.Uri | undefined): Promise<void> {
    await scheduleRunRequest(dockerFileUri, "DockerBuildRequest", actionContext);
}
