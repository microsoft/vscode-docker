/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/* eslint-disable no-template-curly-in-string */

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { resolveVariables } from '../utils/resolveVariables';

export type TemplateCommand = 'build' | 'run' | 'runInteractive' | 'attach' | 'logs' | 'composeUp' | 'composeDown';

type CommandTemplate = {
    template: string,
    label?: string,
    match?: string,
};

// NOTE: the default templates are duplicated in package.json, since VSCode offers no way of looking up extension-level default settings
// So, when modifying them here, be sure to modify them there as well!
const defaults: { [key in TemplateCommand]: CommandTemplate } = {
    'build': { label: 'Docker Build', template: 'docker build --rm -f "${dockerfile}" -t ${tag} "${context}"' },
    'run': { label: 'Docker Run', template: 'docker run --rm -d ${exposedPorts} ${tag}' },
    'runInteractive': { label: 'Docker Run (Interactive)', template: 'docker run --rm -it ${exposedPorts} ${tag}' },
    'attach': { label: 'Docker Attach', template: 'docker exec -it ${containerId} ${shellCommand}' },
    'logs': { label: 'Docker Logs', template: 'docker logs -f ${containerId}' },
    'composeUp': { label: 'Compose Up', template: 'docker-compose up ${configurationFile} ${detached} ${build}' },
    'composeDown': { label: 'Compose Down', template: 'docker-compose down ${configurationFile}' },
};

export async function selectTemplate(context: IActionContext, command: TemplateCommand, matchContext?: string, folder?: vscode.WorkspaceFolder, additionalVariables?: { [key: string]: string }): Promise<string> {
    // Get the templates from settings
    const config = vscode.workspace.getConfiguration('docker');
    const templateSetting: CommandTemplate[] | string = config.get(`commands.${command}`);
    let templates: CommandTemplate[];

    if (typeof (templateSetting) === 'string') {
        templates = [{ template: templateSetting }] as CommandTemplate[];
    } else {
        templates = templateSetting;
    }

    // Make sure all templates have some sort of label
    templates.forEach(template => {
        template.label = template.label ?? defaults[command].label;
    })

    // Filter off non-matching / invalid templates
    templates = templates.filter(template => {
        if (!template.template) {
            // Don't wait
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.ui.showWarningMessage(`No command template defined for template '${template.label}'. This template will be skipped.`);
            return false;
        }

        if (!template.match) {
            return true;
        }

        try {
            return new RegExp(template.match, 'i').test(matchContext);
        } catch {
            // Don't wait
            // eslint-disable-next-line @typescript-eslint/no-floating-promises
            ext.ui.showWarningMessage(`Invalid match expression for template '${template.label}'. This template will be skipped.`);
            return false;
        }
    });

    let selectedTemplate: CommandTemplate;

    if (templates.length === 0) {
        // No templates matched, so fall back to extension default
        selectedTemplate = defaults[command];
    } else {
        selectedTemplate = await quickPickTemplate(context, templates);
    }

    context.telemetry.properties.isDefaultCommand = selectedTemplate.template === defaults[command].template ? 'true' : 'false';
    context.telemetry.properties.isCommandRegexMatched = selectedTemplate.match ? 'true' : 'false';

    return resolveVariables(selectedTemplate.template, folder, additionalVariables);
}

async function quickPickTemplate(context: IActionContext, templates: CommandTemplate[]): Promise<CommandTemplate> {
    if (templates.length === 1) {
        // No need to prompt if only one remains
        return templates[0];
    }

    const items: IAzureQuickPickItem<CommandTemplate>[] = templates.map(template => {
        return {
            label: template.label,
            detail: template.template,
            data: template,
        }
    });

    const selection = await ext.ui.showQuickPick(items, {
        placeHolder: 'Choose a command template to execute'
    });

    return selection.data;
}
