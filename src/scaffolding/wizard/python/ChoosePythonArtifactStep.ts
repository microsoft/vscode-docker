/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IAzureQuickPickItem } from '@microsoft/vscode-azext-utils';
import { localize } from '../../../localize';
import { Item, resolveFilesOfPattern } from '../../../utils/quickPickFile';
import { ChooseArtifactStep } from '../ChooseArtifactStep';
import { PythonScaffoldingWizardContext } from './PythonScaffoldingWizardContext';

const moduleRegex = /([a-z_]+[.])*([a-z_])/i;

// Exclude Python files in the .venv folder from showing in the pick list
const excludePattern = '.[Vv][Ee][Nn][Vv]/**';

// For Django, additionally exclude the WSGI/ASGI files to prevent user confusion
const djangoExcludePattern = '{.[Vv][Ee][Nn][Vv]/**,**/[AaWw][Ss][Gg][Ii].[Pp][Yy]}';

export class ChoosePythonArtifactStep extends ChooseArtifactStep<PythonScaffoldingWizardContext> {
    public constructor() {
        super(
            localize('vscode-docker.scaffold.choosePythonArtifactStep.promptText', 'Choose the app\'s entry point (e.g. manage.py, app.py)'),
            ['**/manage.py', '**/app.py', '**/*.[Pp][Yy]'], // Including manage.py and app.py here pushes them to the top of the pick list; resolveFilesOfPattern dedupes
            localize('vscode-docker.scaffold.choosePythonArtifactStep.noItemsFound', 'No Python files were found.')
        );
    }

    public async prompt(wizardContext: PythonScaffoldingWizardContext): Promise<void> {
        const items = await resolveFilesOfPattern(
            wizardContext.workspaceFolder,
            this.globPatterns,
            wizardContext.platform === 'Python: Django' ? djangoExcludePattern : excludePattern
        ) ?? [];

        const pickChoices: IAzureQuickPickItem<Item | undefined>[] = items.map(i => {
            return {
                label: i.relativeFilePath,
                data: i,
            };
        });

        const enterModuleChoice: IAzureQuickPickItem = {
            label: localize('vscode-docker.scaffold.choosePythonArtifactStep.chooseModule', 'Enter a Python module instead...'),
            data: undefined,
        };

        pickChoices.push(enterModuleChoice);

        const result = await wizardContext.ui.showQuickPick(pickChoices, {
            placeHolder: this.promptText,
            suppressPersistence: true,
        });

        if (result === enterModuleChoice) {
            // User wants a module target
            const module = await wizardContext.ui.showInputBox({
                prompt: localize('vscode-docker.scaffold.choosePythonArtifactStep.enterModule', 'Enter a Python module name (e.g. myapp.manage)'),
                validateInput: (value: string): string | undefined => {
                    if (moduleRegex.test(value)) {
                        return undefined;
                    }

                    return localize('vscode-docker.scaffold.choosePythonArtifactStep.moduleInvalid', 'Enter a valid Python module name (e.g. myapp.manage)');
                },
            });

            wizardContext.artifact = module;
            wizardContext.pythonArtifact = {
                module: module,
            };
        } else {
            // User chose a file target
            wizardContext.artifact = result.data.absoluteFilePath;
            wizardContext.pythonArtifact = {
                file: result.data.relativeFilePath,
            };
        }
    }

    public shouldPrompt(wizardContext: PythonScaffoldingWizardContext): boolean {
        return super.shouldPrompt(wizardContext) || !wizardContext.pythonArtifact;
    }

    protected setTelemetry(wizardContext: PythonScaffoldingWizardContext): void {
        wizardContext.telemetry.properties.pythonArtifact = ('module' in wizardContext.pythonArtifact) ? 'module' : 'file';
    }
}
