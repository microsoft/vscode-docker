/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { executeAsTask } from "../../utils/executeAsTask";
import { CVEWebViewPanel } from "./CVEWebViewPanel";
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';
import * as os from 'os';

async function scan(context: IActionContext, node?: ImageTreeItem): Promise<any> {
    // creating temp folder to save results
    const tmpDir = await fs.mkdtemp(path.join(os.tmpdir(), 'atomist-scan'));
    const sbomFile = 'sbom.json';
    const cmd = [
        ext.dockerContextManager.getDockerCommand(context),
        'run',
        '-v', `${tmpDir}:/atm`, // mount folder to be able to read the result
        `-v`, `"/var/run/docker.sock":"/var/run/docker.sock"`, // sharing docker socket
        'ghcr.io/cdupuis/index-cli-plugin:main',
        'index', 'sbom', '--image', node.fullTag, '--output', `/atm/${sbomFile}`, '--include-vulns'
    ];
    await executeAsTask(
        context,
        cmd.join(' '),
        `Scanning ${node.fullTag}`,
        { addDockerEnv: true, focus: true }
    );

    const sbomPath = `${tmpDir}/${sbomFile}`;
    // reading and parsing results
    const rawResults = await fs.readFile(sbomPath, { encoding: 'utf8', flag: 'r' });
    const sbomResults = JSON.parse(rawResults + '');
    return sbomResults;
}

export async function scanImageWithAtomist(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.inspect.noImages', 'No images are available to scan')
        });
    }
    const progressOptions: vscode.ProgressOptions = {
        location: vscode.ProgressLocation.Notification,
        title: localize('vscode-docker.commands.images.scan', 'Scanning for vulnerabilities...'),
    };
    const sbomResults = await vscode.window.withProgress(progressOptions, async () => await scan(context, node));
    CVEWebViewPanel.show(vscode.Uri.parse("./"), sbomResults?.vulnerabilities || [], node.fullTag);
}
