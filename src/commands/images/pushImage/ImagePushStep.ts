/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { AzureWizardExecuteStep } from '@microsoft/vscode-azext-utils';
import { ext } from '../../../extensionVariables';
import { TaskCommandRunnerFactory } from '../../../runtimes/runners/TaskCommandRunnerFactory';
import { addImageTaggingTelemetry } from '../tagImage';
import { PushImageWizardContext } from './PushImageWizardContext';

export class ImagePushStep extends AzureWizardExecuteStep<PushImageWizardContext> {
    public priority: number = 200;

    public async execute(wizardContext: PushImageWizardContext): Promise<void> {
        addImageTaggingTelemetry(wizardContext, wizardContext.finalTag, '');

        const client = await ext.runtimeManager.getClient();
        const taskCRF = new TaskCommandRunnerFactory(
            {
                taskName: wizardContext.finalTag
            }
        );

        await taskCRF.getCommandRunner()(
            client.pushImage({ imageRef: wizardContext.finalTag })
        );
    }

    public shouldExecute(wizardContext: PushImageWizardContext): boolean {
        return true;
    }
}
