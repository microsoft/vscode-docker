/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getValidImageName } from '../../../utils/getValidImageName';
import { readPackage } from '../../../utils/nodeUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { NodeScaffoldingWizardContext } from './NodeScaffoldingWizardContext';

export class NodeGatherInformationStep extends GatherInformationStep<NodeScaffoldingWizardContext> {
    public async prompt(wizardContext: NodeScaffoldingWizardContext): Promise<void> {
        const nodePackage = await readPackage(wizardContext.artifact);

        if (nodePackage.scripts?.start) {
            wizardContext.nodeCmdParts = ['npm', 'start'];

            const [, main] = /node (.+)/i.exec(nodePackage.scripts.start) ?? [undefined, undefined];
            wizardContext.nodeDebugCmdParts = ['node', '--inspect=0.0.0.0:9229', nodePackage.main || main || 'index.js'];
        } else {
            wizardContext.nodeCmdParts = ['node', nodePackage.main || 'index.js']
            wizardContext.nodeDebugCmdParts = ['node', '--inspect=0.0.0.0:9229', nodePackage.main || 'index.js'];
        }

        if (nodePackage.version) {
            wizardContext.version = nodePackage.version;
        }

        if (nodePackage.name) {
            wizardContext.serviceName = getValidImageName(nodePackage.name);
        }

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: NodeScaffoldingWizardContext): boolean {
        return !wizardContext.nodeCmdParts || !wizardContext.nodeDebugCmdParts;
    }
}
