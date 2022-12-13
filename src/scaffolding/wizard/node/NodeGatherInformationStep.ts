/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import { getValidImageName } from '../../../utils/getValidImageName';
import { readPackage } from '../../../utils/nodeUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { NodeScaffoldingWizardContext } from './NodeScaffoldingWizardContext';

export class NodeGatherInformationStep extends GatherInformationStep<NodeScaffoldingWizardContext> {
    private packageHasStartScript: boolean = false;

    public async prompt(wizardContext: NodeScaffoldingWizardContext): Promise<void> {
        const nodePackage = await readPackage(wizardContext.artifact);

        if (nodePackage.scripts?.start) {
            this.packageHasStartScript = true;
            wizardContext.nodeCmdParts = ['npm', 'start'];

            const [, main] = /node (.+)/i.exec(nodePackage.scripts.start) ?? [undefined, undefined];
            wizardContext.nodeDebugCmdParts = ['node', '--inspect=0.0.0.0:9229', nodePackage.main || main || 'index.js'];
        } else if (nodePackage.main) {
            wizardContext.nodeCmdParts = ['node', nodePackage.main];
            wizardContext.nodeDebugCmdParts = ['node', '--inspect=0.0.0.0:9229', nodePackage.main];
        } else {
            wizardContext.nodeCmdParts = ['npm', 'start'];
            wizardContext.nodeDebugCmdParts = ['node', '--inspect=0.0.0.0:9229', 'index.js'];
        }

        if (nodePackage.version) {
            wizardContext.version = nodePackage.version;
        }

        if (nodePackage.name) {
            wizardContext.serviceName = getValidImageName(nodePackage.name);
        }

        wizardContext.debugPorts = [9229];

        if (!wizardContext.dockerBuildContext) {
            // For Node, build context is always adjacent the artifact (package.json)
            wizardContext.dockerBuildContext = path.dirname(wizardContext.artifact);
        }

        if (!wizardContext.dockerfileDirectory) {
            // For .NET, the Dockerfile is always adjacent the artifact (package.json)
            wizardContext.dockerfileDirectory = path.dirname(wizardContext.artifact);
        }

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: NodeScaffoldingWizardContext): boolean {
        return !wizardContext.nodeCmdParts || !wizardContext.nodeDebugCmdParts || !wizardContext.dockerBuildContext || !wizardContext.dockerfileDirectory;
    }

    protected setTelemetry(wizardContext: NodeScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.packageHasStartScript = this.packageHasStartScript.toString();
    }
}
