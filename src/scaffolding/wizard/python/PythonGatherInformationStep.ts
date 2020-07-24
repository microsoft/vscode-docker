/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { inferPythonArgs, PythonDefaultPorts } from '../../../utils/pythonUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { PythonScaffoldingWizardContext } from './PythonScaffoldingWizardContext';

const debugCmdPart = 'pip install debugpy -t /tmp && python /tmp/debugpy --wait-for-client --listen 0.0.0.0:5678';

export class PythonGatherInformationStep extends GatherInformationStep<PythonScaffoldingWizardContext> {
    public async prompt(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        switch (wizardContext.platform) {
            case 'Python: Django':
                wizardContext.pythonProjectType = 'django';
                this.getDjangoCmdParts(wizardContext);
                break;
            case 'Python: Flask':
                wizardContext.pythonProjectType = 'flask';
                this.getFlaskCmdParts(wizardContext);
                break;
            case 'Python: General':
            default:
                wizardContext.pythonProjectType = 'general';
                this.getGeneralCmdParts(wizardContext);
        }

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: PythonScaffoldingWizardContext): boolean {
        return !wizardContext.pythonRequirements || !wizardContext.pythonCmdParts || !wizardContext.pythonDebugCmdParts || !wizardContext.pythonProjectType;
    }

    private getDjangoCmdParts(wizardContext: PythonScaffoldingWizardContext): void {
        const { app, args, bindPort } = this.getCommonProps(wizardContext);

        wizardContext.pythonRequirements = {
            django: '3.0.8',
            gunicorn: '20.0.4',
        };

        wizardContext.pythonCmdParts = [
            'gunicorn',
            '--bind',
            `0.0.0.0:${bindPort}`,
            'TODO', // TODO wsgi stuff
        ];

        wizardContext.pythonDebugCmdParts = [
            'sh',
            '-c',
            `${debugCmdPart} ${app.join(' ')} ${args.join(' ')}`,
        ];
    }

    private getFlaskCmdParts(wizardContext: PythonScaffoldingWizardContext): void {
        const { args, bindPort } = this.getCommonProps(wizardContext);

        wizardContext.pythonRequirements = {
            flask: '1.1.2',
            gunicorn: '20.0.4',
        };

        wizardContext.pythonCmdParts = [
            'gunicorn',
            '--bind',
            `0.0.0.0:${bindPort}`,
            'TODO', // TODO `${inferPythonWsgiModule(wizardContext.pythonArtifact)}:app`,
        ];

        wizardContext.pythonDebugCmdParts = [
            'sh',
            '-c',
            `${debugCmdPart} -m flask ${args.join(' ')}`,
        ];
    }

    private getGeneralCmdParts(wizardContext: PythonScaffoldingWizardContext): void {
        const { app, args } = this.getCommonProps(wizardContext);

        wizardContext.pythonCmdParts = [
            'python',
            ...app,
            ...args,
        ];

        wizardContext.pythonDebugCmdParts = [
            'sh',
            '-c',
            `${debugCmdPart} ${app.join(' ')} ${args.join(' ')}`,
        ];
    }

    private getCommonProps(wizardContext: PythonScaffoldingWizardContext): { app: string[], args: string[], bindPort: number } {
        return {
            app: 'module' in wizardContext.pythonArtifact ?
                ['-m', wizardContext.pythonArtifact.module] :
                [wizardContext.pythonArtifact.file],

            args: inferPythonArgs(wizardContext.pythonProjectType, wizardContext.ports) ?? [],

            bindPort: wizardContext.ports ? wizardContext.ports[0] : PythonDefaultPorts.get(wizardContext.pythonProjectType),
        }
    }
}
