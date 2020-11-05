/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ContextType } from '../docker/Contexts';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { resolveVariables } from '../utils/resolveVariables';

type TemplateCommand = 'build' | 'run' | 'runInteractive' | 'attach' | 'logs' | 'composeUp' | 'composeDown';

// Exported only for tests
export type CommandTemplate = {
    template: string,
    label: string,
    match?: string,
    contextTypes?: ContextType[],
};

// NOTE: the default templates are duplicated in package.json, since VSCode offers no way of looking up extension-level default settings
// So, when modifying them here, be sure to modify them there as well!
// Exported only for tests
export const defaultCommandTemplates: { [key in TemplateCommand]: CommandTemplate[] } = {
    /* eslint-disable no-template-curly-in-string */
    'build': [{ label: 'Docker Build', template: 'docker build --pull --rm -f "${dockerfile}" -t ${tag} "${context}"' }],
    'run': [{ label: 'Docker Run', template: 'docker run --rm -d ${exposedPorts} ${tag}' }],
    'runInteractive': [{ label: 'Docker Run (Interactive)', template: 'docker run --rm -it ${exposedPorts} ${tag}' }],
    'attach': [{ label: 'Docker Attach', template: 'docker exec -it ${containerId} ${shellCommand}' }],
    'logs': [{ label: 'Docker Logs', template: 'docker logs --tail 1000 -f ${containerId}' }],
    'composeUp': [
        { label: 'Compose Up', template: 'docker-compose ${configurationFile} up ${detached} ${build}', contextTypes: ['moby'] },
        { label: 'Compose Up', template: 'docker compose ${configurationFile} up ${detached}' },
    ],
    'composeDown': [
        { label: 'Compose Down', template: 'docker-compose ${configurationFile} down', contextTypes: ['moby'] },
        { label: 'Compose Down', template: 'docker compose ${configurationFile} down' },
    ],
    /* eslint-enable no-template-curly-in-string */
};

export async function selectBuildCommand(context: IActionContext, folder: vscode.WorkspaceFolder, dockerfile: string, buildContext: string): Promise<string> {
    return await selectCommandTemplate(
        context,
        'build',
        [folder.name, dockerfile],
        folder,
        { 'dockerfile': dockerfile, 'context': buildContext }
    );
}

export async function selectRunCommand(context: IActionContext, fullTag: string, interactive: boolean, exposedPorts?: { [portAndProtocol: string]: unknown }): Promise<string> {
    let portsString: string = '';
    if (exposedPorts) {
        portsString = Object.keys(exposedPorts).reduce((partialPortsString: string, portAndProtocol: string) => {
            return `${partialPortsString} -p ${portAndProtocol.split('/')[0]}:${portAndProtocol}`
        }, portsString);
    }

    return await selectCommandTemplate(
        context,
        interactive ? 'runInteractive' : 'run',
        [fullTag],
        undefined,
        { 'tag': fullTag, 'exposedPorts': portsString }
    );
}

export async function selectAttachCommand(context: IActionContext, containerName: string, fullTag: string, containerId: string, shellCommand: string): Promise<string> {
    return await selectCommandTemplate(
        context,
        'attach',
        [containerName, fullTag],
        undefined,
        { 'containerId': containerId, 'shellCommand': shellCommand }
    );
}

export async function selectLogsCommand(context: IActionContext, containerName: string, fullTag: string, containerId: string): Promise<string> {
    return await selectCommandTemplate(
        context,
        'logs',
        [containerName, fullTag],
        undefined,
        { 'containerId': containerId }
    );
}

export async function selectComposeCommand(context: IActionContext, folder: vscode.WorkspaceFolder, composeCommand: 'up' | 'down', configurationFile?: string, detached?: boolean, build?: boolean): Promise<string> {
    return await selectCommandTemplate(
        context,
        composeCommand === 'up' ? 'composeUp' : 'composeDown',
        [folder.name, configurationFile],
        folder,
        { 'configurationFile': configurationFile ? `-f \"${configurationFile}\"` : '', 'detached': detached ? '-d' : '', 'build': build ? '--build' : '' }
    );
}

// Exported only for tests
export async function selectCommandTemplate(context: IActionContext, command: TemplateCommand, matchContext: string[], folder: vscode.WorkspaceFolder | undefined, additionalVariables: { [key: string]: string }): Promise<string> {
    // Get the current context type
    const currentContextType = (await ext.dockerContextManager.getCurrentContext()).ContextType;

    // Get the configured settings values
    const config = vscode.workspace.getConfiguration('docker');
    const templateSetting: CommandTemplate[] | string = config.get(`commands.${command}`);
    let settingsTemplates: CommandTemplate[];

    // Get a template array from settings
    if (typeof (templateSetting) === 'string') {
        settingsTemplates = [{ template: templateSetting }] as CommandTemplate[];
    } else if (!templateSetting) {
        // If templateSetting is some falsy value, make this an empty array so the hardcoded default above gets used
        settingsTemplates = [];
    } else {
        settingsTemplates = templateSetting;
    }

    // Get a template array from hardcoded defaults
    const hardcodedTemplates = defaultCommandTemplates[command];

    // Build the template selection matrix. Settings-defined values are preferred over hardcoded, and constrained over unconstrained.
    // Constrained templates have either `match` or `contextTypes`, and must match the constraints.
    // Unconstrained templates have neither `match` nor `contextTypes`.
    const templateMatrix: CommandTemplate[][] = [];

    // 0. Settings-defined templates with either `match` or `contextTypes`, that satisfy the constraints
    templateMatrix.push(getConstrainedTemplates(settingsTemplates, matchContext, currentContextType));

    // 1. Settings-defined templates with neither `match` nor `contextTypes`
    templateMatrix.push(getUnconstrainedTemplates(settingsTemplates));

    // 2. Hardcoded templates with either `match` or `contextTypes`, that satisfy the constraints
    templateMatrix.push(getConstrainedTemplates(hardcodedTemplates, matchContext, currentContextType));

    // 3. Hardcoded templates with neither `match` nor `contextTypes`
    templateMatrix.push(getUnconstrainedTemplates(hardcodedTemplates));

    // Select the template to use
    let selectedTemplate: CommandTemplate;
    for (const templates of templateMatrix) {
        // Skip any empty group
        if (templates.length === 0) {
            continue;
        }

        // Choose a template from the first non-empty group
        // If only one matches there will be no prompt
        selectedTemplate = await quickPickTemplate(context, templates);
        break;
    }

    if (!selectedTemplate) {
        throw new Error(localize('vscode-docker.commands.selectCommandTemplate.noTemplate', 'No command template was found for command \'{0}\'', command));
    }

    context.telemetry.properties.isDefaultCommand = hardcodedTemplates.some(t => t.template === selectedTemplate.template) ? 'true' : 'false';
    context.telemetry.properties.isCommandRegexMatched = selectedTemplate.match ? 'true' : 'false';
    context.telemetry.properties.commandContextType = `[${selectedTemplate.contextTypes?.join(', ') ?? ''}]`;
    context.telemetry.properties.currentContextType = currentContextType;

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
        placeHolder: localize('vscode-docker.commands.selectCommandTemplate.chooseTemplate', 'Choose a command template to execute')
    });

    return selection.data;
}

function getConstrainedTemplates(templates: CommandTemplate[], matchContext: string[], currentContextType: ContextType): CommandTemplate[] {
    return templates.filter(template => {
        if (!template.contextTypes && !template.match) {
            // If neither contextTypes nor match is defined, this is an unconstrained template
            return false;
        }

        return isContextTypeConstraintSatisfied(currentContextType, template.contextTypes) &&
            isMatchConstraintSatisfied(matchContext, template.match);
    });
}

function getUnconstrainedTemplates(templates: CommandTemplate[]): CommandTemplate[] {
    return templates.filter(template => {
        // Both contextTypes and match must be falsy to make this an unconstrained template
        return !template.contextTypes && !template.match;
    });
}

function isContextTypeConstraintSatisfied(currentContextType: ContextType, templateContextTypes: ContextType[] | undefined): boolean {
    if (!templateContextTypes) {
        // If templateContextTypes is undefined or empty, it is automatically satisfied
        return true;
    }

    return templateContextTypes.some(tc => tc === currentContextType);
}

function isMatchConstraintSatisfied(matchContext: string[], match: string | undefined): boolean {
    if (!match) {
        // If match is undefined or empty, it is automatically satisfied
        return true;
    }

    try {
        const matcher = new RegExp(match, 'i');
        return matchContext.some(m => matcher.test(m));
    } catch {
        // Don't wait
        void ext.ui.showWarningMessage(localize('vscode-docker.commands.selectCommandTemplate.invalidMatch', 'Invalid match expression \'{0}\'. This template will be skipped.', match));
    }

    return false;
}
