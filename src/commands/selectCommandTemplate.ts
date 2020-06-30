/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { IActionContext, IAzureQuickPickItem } from 'vscode-azureextensionui';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { resolveVariables } from '../utils/resolveVariables';

export type TemplateCommand = 'build' | 'run' | 'runInteractive' | 'attach' | 'logs' | 'composeUp' | 'composeDown';

type CommandTemplate = {
    template: string,
    label: string,
    match?: string,
};

// NOTE: the default templates are duplicated in package.json, since VSCode offers no way of looking up extension-level default settings
// So, when modifying them here, be sure to modify them there as well!
const defaults: { [key in TemplateCommand]: CommandTemplate } = {
    /* eslint-disable no-template-curly-in-string */
    'build': { label: 'Docker Build', template: 'docker build --pull --rm -f "${dockerfile}" -t ${tag} "${context}"' },
    'run': { label: 'Docker Run', template: 'docker run --rm -d ${exposedPorts} ${tag}' },
    'runInteractive': { label: 'Docker Run (Interactive)', template: 'docker run --rm -it ${exposedPorts} ${tag}' },
    'attach': { label: 'Docker Attach', template: 'docker exec -it ${containerId} ${shellCommand}' },
    'logs': { label: 'Docker Logs', template: 'docker logs -f ${containerId}' },
    'composeUp': { label: 'Compose Up', template: 'docker-compose ${configurationFile} up ${detached} ${build}' },
    'composeDown': { label: 'Compose Down', template: 'docker-compose ${configurationFile} down' },
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

async function selectCommandTemplate(context: IActionContext, command: TemplateCommand, matchContext?: string[], folder?: vscode.WorkspaceFolder, additionalVariables?: { [key: string]: string }): Promise<string> {
    // Get the templates from settings
    const config = vscode.workspace.getConfiguration('docker');
    const templateSetting: CommandTemplate[] | string = config.get(`commands.${command}`);
    let templates: CommandTemplate[];

    // Get template(s) from settings
    if (typeof (templateSetting) === 'string') {
        templates = [{ template: templateSetting }] as CommandTemplate[];
    } else if (!templateSetting) {
        // If templateSetting is some falsy value, make this an empty array so the hardcoded default above gets used
        templates = [];
    } else {
        templates = templateSetting;
    }

    // Look for settings-defined template(s) with explicit match, that matches the context
    const matchedTemplates = templates.filter(template => {
        if (template.match) {
            try {
                const matcher = new RegExp(template.match, 'i');
                return matchContext.some(m => matcher.test(m));
            } catch {
                // Don't wait
                // eslint-disable-next-line @typescript-eslint/no-floating-promises
                ext.ui.showWarningMessage(localize('vscode-docker.commands.selectCommandTemplate.invalidMatch', 'Invalid match expression for template \'{0}\'. This template will be skipped.', template.label));
            }
        }

        return false;
    });

    // Look for settings-defined template(s) with no explicit match
    const universalTemplates = templates.filter(template => !template.match);

    // Select from explicit match templates, if none then from settings-defined universal templates, if none then hardcoded default
    let selectedTemplate: CommandTemplate;
    if (matchedTemplates.length > 0) {
        selectedTemplate = await quickPickTemplate(context, matchedTemplates);
    } else if (universalTemplates.length > 0) {
        selectedTemplate = await quickPickTemplate(context, universalTemplates);
    } else {
        selectedTemplate = defaults[command];
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
        placeHolder: localize('vscode-docker.commands.selectCommandTemplate.chooseTemplate', 'Choose a command template to execute')
    });

    return selection.data;
}
