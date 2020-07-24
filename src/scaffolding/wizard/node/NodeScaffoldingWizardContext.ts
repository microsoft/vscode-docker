/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IWizardOptions } from 'vscode-azureextensionui';
import { localize } from '../../../localize';
import { ChooseArtifactStep } from '../ChooseArtifactStep';
import { ChoosePortsStep } from '../ChoosePortsStep';
import { ScaffoldDebuggingStep } from '../ScaffoldDebuggingStep';
import { ScaffoldingWizardContext } from '../ScaffoldingWizardContext';
import { NodeGatherInformationStep } from './NodeGatherInformationStep';

const choosePackageFile = localize('vscode-docker.scaffold.platforms.node.choosePackage', 'Choose a package.json file');
const nodeGlobPatterns = ['**/{[Pp][Aa][Cc][Kk][Aa][Gg][Ee].[Jj][Ss][Oo][Nn]}'];
const noPackageFile = localize('vscode-docker.scaffold.platforms.node.noPackage', 'No package.json files were found in the workspace.');

export interface NodeScaffoldingWizardContext extends ScaffoldingWizardContext {
    nodeCmdParts?: string[];
}

export function getNodeSubwizardOptions(wizardContext: ScaffoldingWizardContext): IWizardOptions<NodeScaffoldingWizardContext> {
    return {
        promptSteps: [
            new ChooseArtifactStep(choosePackageFile, nodeGlobPatterns, noPackageFile),
            new ChoosePortsStep([3000]),
            new NodeGatherInformationStep(),
        ],
        executeSteps: [
            new ScaffoldDebuggingStep(),
        ],
    };
}
