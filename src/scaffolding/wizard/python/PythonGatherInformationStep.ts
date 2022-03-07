/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from 'path';
import * as vscode from 'vscode';
import { PythonDefaultDebugPort, PythonDefaultPorts, inferPythonArgs } from '../../../utils/pythonUtils';
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
            case 'Python: FastAPI':
                wizardContext.pythonProjectType = 'fastapi';
                await this.getFastAPICmdParts(wizardContext);
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

        // For Django apps, there **usually** exists a "wsgi" module in an immediate sub-folder of the primary artifact's folder.
        // So we try to find and use that. Else, we output the comment below instructing the user to enter
        // the correct python path to the wsgi module.

        const wsgiPaths = await vscode.workspace.findFiles(
            new vscode.RelativePattern(path.dirname(wizardContext.artifact), '*/[Ww][Ss][Gg][Ii].[Pp][Yy]'),
            undefined,
            1
        );

        let wsgiModule: string;
        if (wsgiPaths?.length) {
            const serviceName = path.basename(path.dirname(wsgiPaths[0].fsPath));
            wsgiModule = `${serviceName}.wsgi`;
        } else {
            wizardContext.wsgiComment = `# File wsgi.py was not found. Please enter the Python path to wsgi file.`;
            wsgiModule = 'pythonPath.to.wsgi';
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

    private async getFastAPICmdParts(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        const { args, bindPort } = this.getCommonProps(wizardContext);

        let asgiModule: string;

        if ('module' in wizardContext.pythonArtifact) {
            asgiModule = wizardContext.pythonArtifact.module;
        } else if ('file' in wizardContext.pythonArtifact) {
            asgiModule = wizardContext.pythonArtifact.file.replace(/\.[^/.]+$/, '');
        }

        // Replace forward-slashes with dots.
        asgiModule = asgiModule.replace(/\//g, '.');

        wizardContext.pythonCmdParts = [
            'gunicorn',
            '--bind',
            `0.0.0.0:${bindPort}`,
            '-k',
            'uvicorn.workers.UvicornWorker',
            `${asgiModule}:app`,
        ];

        wizardContext.pythonDebugCmdParts = [
            'sh',
            '-c',
            `${debugCmdPart} -m uvicorn ${asgiModule}:app ${args.join(' ')}`,
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
        };
    }
}
