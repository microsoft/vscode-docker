/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import Handlebars = require('handlebars');
import * as path from 'path';
import * as vscode from 'vscode';
import { MessageItem, Progress } from 'vscode';
import { ext } from 'vscode-azureappservice/out/src/extensionVariables';
import { AzureWizardExecuteStep, DialogResponses, UserCancelledError } from 'vscode-azureextensionui';
import { localize } from '../../localize';
import { ScaffoldingWizardContext } from './ScaffoldingWizardContext';

export class ScaffoldFileStep extends AzureWizardExecuteStep<ScaffoldingWizardContext> {
    public constructor(private readonly fileType: '.dockerignore' | 'Dockerfile' | 'docker-compose.yml' | 'docker-compose.debug.yml', public readonly priority: number) {
        super();
    }

    public async execute(wizardContext: ScaffoldingWizardContext, progress: Progress<{ message?: string; increment?: number; }>): Promise<void> {
        const inputPath = await this.getInputPath(wizardContext);
        const outputPath = await this.getOutputPath(wizardContext);

        const input = await fse.readFile(inputPath, 'utf-8');
        const template = Handlebars.compile(input);

        const output = template(wizardContext);

        await this.promptForOverwriteIfNeeded(wizardContext, output, outputPath);

        await fse.writeFile(outputPath, output, { encoding: 'utf-8' });
    }

    public shouldExecute(wizardContext: ScaffoldingWizardContext): boolean {
        return this.fileType === 'docker-compose.yml' || this.fileType === 'docker-compose.debug.yml' ?
            !!wizardContext.scaffoldCompose :
            true;
    }

    private async getInputPath(wizardContext: ScaffoldingWizardContext): Promise<string> {
        const config = vscode.workspace.getConfiguration('docker');
        let templatesPath = config.get<string | undefined>('scaffolding.templatePath', undefined);

        if (!templatesPath || !(await fse.pathExists(templatesPath))) {
            templatesPath = path.join(ext.context.asAbsolutePath('resources'), 'templates');
        }

        switch (wizardContext.platform) {
            case 'Node.js':
                return path.join(templatesPath, 'node', this.fileType);
            case '.NET: ASP.NET Core':
                return path.join(templatesPath, 'netCore', 'aspnet', this.fileType);
            case '.NET: Core Console':
                return path.join(templatesPath, 'netCore', 'console', this.fileType);
            case 'Python: Django':
                return path.join(templatesPath, 'python', 'django', this.fileType);
            case 'Python: Flask':
                return path.join(templatesPath, 'python', 'flask', this.fileType);
            case 'Python: General':
                return path.join(templatesPath, 'python', 'general', this.fileType);
            case 'Java':
                return path.join(templatesPath, 'java', this.fileType);
            case 'C++':
                return path.join(templatesPath, 'cpp', this.fileType);
            case 'Go':
                return path.join(templatesPath, 'go', this.fileType);
            case 'Ruby':
                return path.join(templatesPath, 'ruby', this.fileType);
            case 'Other':
                return path.join(templatesPath, 'cpp', this.fileType);
            default:
                throw new Error(localize('vscode-docker.scaffold.scaffoldFileStep.unknownPlatform', 'Unknown platform \'{0}\'', wizardContext.platform));
        }
    }

    private async getOutputPath(wizardContext: ScaffoldingWizardContext): Promise<string> {
        if (this.fileType === 'Dockerfile' && wizardContext.relativeDockerfilePath) {
            // Dockerfiles may be placed in subpaths; the others are always at the workspace folder level
            return path.resolve(wizardContext.workspaceFolder.uri.fsPath, wizardContext.relativeDockerfilePath);
        } else {
            return path.join(wizardContext.workspaceFolder.uri.fsPath, this.fileType);
        }
    }

    private async promptForOverwriteIfNeeded(wizardContext: ScaffoldingWizardContext, output: string, outputPath: string): Promise<void> {
        if (wizardContext.overwriteAll) {
            // If overwriteAll is set, no need to prompt
            return;
        } else if (!(await fse.pathExists(outputPath))) {
            // If the output file does not exist, no need to prompt
            return;
        } else {
            const existingContents = await fse.readFile(outputPath, 'utf-8');

            if (output === existingContents) {
                // If the output contents are identical, no need to prompt
                return;
            }
        }

        // Otherwise, prompt
        const prompt = localize('vscode-docker.scaffold.scaffoldFileStep.prompt', 'Do you want to overwrite \'{0}\'?', this.fileType);
        const overwrite: MessageItem = {
            title: localize('vscode-docker.scaffold.scaffoldFileStep.overwrite', 'Overwrite')
        };
        const overwriteAll: MessageItem = {
            title: localize('vscode-docker.scaffold.scaffoldFileStep.overwriteAll', 'Overwrite All')
        };

        const response = await ext.ui.showWarningMessage(prompt, overwriteAll, overwrite, DialogResponses.cancel);

        // Throw if the response is Cancel (Escape / X will throw above)
        if (response === DialogResponses.cancel) {
            throw new UserCancelledError();
        } else if (response === overwriteAll) {
            wizardContext.overwriteAll = true;
        }
    }
}
