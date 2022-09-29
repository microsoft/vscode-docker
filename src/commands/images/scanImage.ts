/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { ext } from "../../extensionVariables";
import { localize } from '../../localize';
import { ImageTreeItem } from "../../tree/images/ImageTreeItem";
import { executeAsTask } from "../../utils/executeAsTask";
import { CatCodiconsPanel } from "./CatCodiconsPanel";
import * as vscode from 'vscode';
import { time } from "console";
import { systemDefaultPlatform } from "@vscode/test-electron/out/util";

export async function scanImageWithAtomist(context: IActionContext, node?: ImageTreeItem): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: localize('vscode-docker.commands.images.inspect.noImages', 'No images are available to scan')
        });
    }


    await executeAsTask(
        context,
        `${ext.dockerContextManager.getDockerCommand(context)} run -it -v $(pwd)/code/vscode-docker:/atm -v "/var/run/docker.sock":"/var/run/docker.sock" ghcr.io/cdupuis/index-cli-plugin:main index sbom --image ${node.fullTag} --output /atm/sbom.json --include-vulns`, 'Scanning', { addDockerEnv: true, focus: true },
    );
    // await new Promise(f => setTimeout(f, 2000));
    const sbomResults = await import('../../sbom.json');
    // await fetch('./sbom.json')
    //     .then((response) => response.json())
    //     .then((json) => sbomResults = json);
    CatCodiconsPanel.show(vscode.Uri.parse("./"), sbomResults?.vulnerabilities);
}
