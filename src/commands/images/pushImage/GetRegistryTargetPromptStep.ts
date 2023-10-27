/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardPromptStep, IActionContext, NoResourceFoundError } from '@microsoft/vscode-azext-utils';
import { parseDockerLikeImageName } from '@microsoft/vscode-container-client';
import { CommonRegistry } from '@microsoft/vscode-docker-registries';
import * as vscode from 'vscode';
import { ext } from '../../../extensionVariables';
import { NormalizedImageNameInfo } from '../../../tree/images/NormalizedImageNameInfo';
import { UnifiedRegistryItem } from '../../../tree/registries/UnifiedRegistryTreeDataProvider';
import { registryExperience } from '../../../utils/registryExperience';
import { PushImageWizardContext } from './PushImageWizardContext';

export class GetRegistryTargetPromptStep extends AzureWizardPromptStep<PushImageWizardContext> {
    public async configureBeforePrompt(wizardContext: PushImageWizardContext): Promise<void> {
        // If the image is qualified (has a slash), we'll look for a matching registry in the tree view
        if (this.registryIsDeterminate(wizardContext.initialTag)) {
            wizardContext.connectedRegistry = await this.tryGetConnectedRegistryForPath(wizardContext, wizardContext.initialTag);
        }
    }

    public async prompt(wizardContext: PushImageWizardContext): Promise<void> {
        try {
            // TODO: if Azure is chosen, a Create ACR pick should be shown
            wizardContext.connectedRegistry = await registryExperience<CommonRegistry>(wizardContext, { contextValueFilter: { include: [/commonregistry/i] } });
        } catch (error) {
            if (error instanceof NoResourceFoundError) {
                // Do nothing, move on without a selected registry
            } else {
                // Rethrow
                throw error;
            }
        }
    }

    public shouldPrompt(wizardContext: PushImageWizardContext): boolean {
        return !wizardContext.connectedRegistry && !this.registryIsDeterminate(wizardContext.initialTag) && this.shouldPromptForRegistry;
    }

    private async tryGetConnectedRegistryForPath(context: IActionContext, baseImagePath: string): Promise<UnifiedRegistryItem<CommonRegistry> | undefined> {
        const baseImageNameInfo = parseDockerLikeImageName(baseImagePath);
        const normalizedImageNameInfo = new NormalizedImageNameInfo(baseImageNameInfo);

        const allRegistries = await vscode.window.withProgress({
            location: vscode.ProgressLocation.Notification,
            title: vscode.l10n.t('Determining registry to push to...'),
        }, () => ext.registriesTree.getConnectedRegistries(normalizedImageNameInfo.normalizedRegistry));

        return allRegistries.find((registry) => registry.wrappedItem.baseUrl.authority === normalizedImageNameInfo.normalizedRegistry);
    }

    private get shouldPromptForRegistry(): boolean {
        return vscode.workspace.getConfiguration('docker').get('promptForRegistryWhenPushingImages', true);
    }

    private registryIsDeterminate(imageName: string): boolean {
        return imageName.includes('/');
    }
}
