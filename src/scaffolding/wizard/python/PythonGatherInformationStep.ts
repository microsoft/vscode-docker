/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { inferPythonArgs, PythonDefaultDebugPort, PythonDefaultPorts } from '../../../utils/pythonUtils';
import { GatherInformationStep } from '../GatherInformationStep';
import { PythonScaffoldingWizardContext } from './PythonScaffoldingWizardContext';

const debugCmdPart = 'pip install debugpy -t /tmp && python /tmp/debugpy --wait-for-client --listen 0.0.0.0:5678';

export class PythonGatherInformationStep extends GatherInformationStep<PythonScaffoldingWizardContext> {
    public async prompt(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        switch (wizardContext.platform) {
            case 'Python: Django':
                wizardContext.pythonProjectType = 'django';
                await this.getDjangoCmdParts(wizardContext);
                break;
            case 'Python: Flask':
                wizardContext.pythonProjectType = 'flask';
                await this.getFlaskCmdParts(wizardContext);
                break;
            case 'Python: General':
            default:
                wizardContext.pythonProjectType = 'general';
                await this.getGeneralCmdParts(wizardContext);
        }

        await super.prompt(wizardContext);
    }

    public shouldPrompt(wizardContext: PythonScaffoldingWizardContext): boolean {
        return !wizardContext.pythonCmdParts || !wizardContext.pythonDebugCmdParts || !wizardContext.pythonProjectType;
    }

    private async getDjangoCmdParts(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        const { app, args, bindPort } = this.getCommonProps(wizardContext);

        // For Django apps, there **usually** exists a "wsgi" module in a sub-folder named the same as the project folder.
        // So we check if that path exists, then use it. Else, we output the comment below instructing the user to enter
        // the correct python path to the wsgi module.

        let wsgiModule: string;
        const serviceName = path.basename(wizardContext.workspaceFolder.uri.fsPath);
        const wsgiPath = path.join(wizardContext.workspaceFolder.uri.fsPath, serviceName, 'wsgi.py');

        if (!(await fse.pathExists(wsgiPath))) {
            wizardContext.wsgiComment = `# File wsgi.py was not found in subfolder: '${serviceName}'. Please enter the Python path to wsgi file.`;
            wsgiModule = 'pythonPath.to.wsgi';
        } else {
            wsgiModule = `${serviceName}.wsgi`;
        }

        wizardContext.pythonCmdParts = [
            'gunicorn',
            '--bind',
            `0.0.0.0:${bindPort}`,
            wsgiModule,
        ];

        wizardContext.pythonDebugCmdParts = [
            'sh',
            '-c',
            `${debugCmdPart} ${app.join(' ')} ${args.join(' ')}`,
        ];

        wizardContext.debugPorts = [PythonDefaultDebugPort];
    }

    private async getFlaskCmdParts(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        const { args, bindPort } = this.getCommonProps(wizardContext);

        let wsgiModule: string;

        if ('module' in wizardContext.pythonArtifact) {
            wsgiModule = wizardContext.pythonArtifact.module;
        } else if ('file' in wizardContext.pythonArtifact) {
            // Get rid of the file extension.
            wsgiModule = wizardContext.pythonArtifact.file.replace(/\.[^/.]+$/, '');
        }

        // Replace forward-slashes with dots.
        wsgiModule = wsgiModule.replace(/\//g, '.');

        wizardContext.pythonCmdParts = [
            'gunicorn',
            '--bind',
            `0.0.0.0:${bindPort}`,
            `${wsgiModule}:app`,
        ];

        wizardContext.pythonDebugCmdParts = [
            'sh',
            '-c',
            `${debugCmdPart} -m flask ${args.join(' ')}`,
        ];

        wizardContext.debugPorts = [PythonDefaultDebugPort];
    }

    private async getGeneralCmdParts(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
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

        wizardContext.debugPorts = [PythonDefaultDebugPort];
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
