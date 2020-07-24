/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { GatherInformationStep } from '../GatherInformationStep';
import { NodeScaffoldingWizardContext } from './NodeScaffoldingWizardContext';

export class NodeGatherInformationStep extends GatherInformationStep<NodeScaffoldingWizardContext> {
    public async prompt(wizardContext: NodeScaffoldingWizardContext): Promise<void> {
        // TODO

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: NodeScaffoldingWizardContext): boolean {
        return !wizardContext.nodeCmdParts || !wizardContext.nodeDebugCmdParts;
    }
}
