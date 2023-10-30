/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizard, IActionContext } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { ImageTreeItem } from '../../../tree/images/ImageTreeItem';
import { CreateAcrStep } from './CreateAcrStep';
import { CreatePickAcrPromptStep } from './CreatePickAcrPromptStep';
import { FinalTagPromptStep } from './FinalTagPromptStep';
import { GetRegistryTargetPromptStep } from './GetRegistryTargetPromptStep';
import { ImagePushStep } from './ImagePushStep';
import { PushImageWizardContext } from './PushImageWizardContext';
import { RegistryLoginStep } from './RegistryLoginStep';

export async function pushImage(context: IActionContext, node: ImageTreeItem | undefined): Promise<void> {
    if (!node) {
        await ext.imagesTree.refresh(context);
        node = await ext.imagesTree.showTreeItemPicker<ImageTreeItem>(ImageTreeItem.contextValue, {
            ...context,
            noItemFoundErrorMessage: vscode.l10n.t('No images are available to push'),
        });
    }

    const wizardContext = context as PushImageWizardContext;
    wizardContext.initialTag = node.fullTag;
    wizardContext.node = node;

    const wizard = new AzureWizard(wizardContext, {
        promptSteps: [
            new GetRegistryTargetPromptStep(),
            new CreatePickAcrPromptStep(),
            new FinalTagPromptStep(),
        ],
        executeSteps: [
            new CreateAcrStep(),
            new RegistryLoginStep(),
            new ImagePushStep(),
        ],
        showLoadingPrompt: true,
    });

    await wizard.prompt();
    await wizard.execute();
}
