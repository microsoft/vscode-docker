// /*---------------------------------------------------------------------------------------------
//  *  Copyright (c) Microsoft Corporation. All rights reserved.
//  *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
//  *--------------------------------------------------------------------------------------------*/

// import { IActionContext, contextValueExperience, nonNullProp } from "@microsoft/vscode-azext-utils";
// import { CommonTag } from "@microsoft/vscode-docker-registries";
// import * as vscode from "vscode";
// import { ext } from "../../extensionVariables";
// import { UnifiedRegistryItem } from "../../tree/registries/UnifiedRegistryTreeDataProvider";

// export async function copyRemoteImageDigest(context: IActionContext, node?: UnifiedRegistryItem<CommonTag>): Promise<void> {
//     if (!node) {
//         if (!node) {
//             node = await contextValueExperience(context, ext.registriesTree, { include: ['registryV2Tag'] });
//         }
//     }

//     let digest: string;
//     if (node instanceof AzureTaskRunTreeItem) {
//         if (node.outputImage) {
//             digest = nonNullProp(node.outputImage, 'digest');
//         } else {
//             throw new Error(vscode.l10n.t('Failed to find output image for this task run.'));
//         }
//     } else {
//         await node.runWithTemporaryDescription(context, vscode.l10n.t('Getting digest...'), async () => {
//             digest = await (<DockerV2TagTreeItem>node).getDigest();
//         });
//     }

//     /* eslint-disable-next-line @typescript-eslint/no-floating-promises */
//     vscode.env.clipboard.writeText(digest);
// }
