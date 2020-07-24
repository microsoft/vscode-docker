/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GatherInformationStep } from '../GatherInformationStep';
import { NetCoreScaffoldingWizardContext } from './NetCoreScaffoldingWizardContext';

export class NetCoreGatherInformationStep extends GatherInformationStep<NetCoreScaffoldingWizardContext> {
    public async prompt(wizardContext: NetCoreScaffoldingWizardContext): Promise<void> {
        // TODO
        // Output file path, base image

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: NetCoreScaffoldingWizardContext): boolean {
        return !wizardContext.netCoreOutputPath || !wizardContext.netCoreRuntimeBaseImage || !wizardContext.netCoreSdkBaseImage;
    }
}
