/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CommandResponse, PortBinding } from '@microsoft/container-runtimes';
import { IActionContext, IAzureQuickPickItem, IAzureQuickPickOptions, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { localize } from '../localize';
import { IContextManager } from '../runtimes/ContextManager';
import { isDockerComposeClient } from '../runtimes/OrchestratorRuntimeManager';
import { resolveVariables } from '../utils/resolveVariables';

type TemplateCommand = 'build' | 'run' | 'runInteractive' | 'attach' | 'logs' | 'composeUp' | 'composeDown' | 'composeUpSubset';

type TemplatePicker = (items: IAzureQuickPickItem<CommandTemplate>[], options: IAzureQuickPickOptions) => Promise<IAzureQuickPickItem<CommandTemplate>>;

interface CommandSettings {
    defaultValue?: CommandTemplate[] | string,
    globalValue?: CommandTemplate[] | string,
    workspaceValue?: CommandTemplate[] | string,
    workspaceFolderValue?: CommandTemplate[] | string,
}

// Exported only for tests
export interface CommandTemplate {
    template: string,
    label: string,
    match?: string,
    contextTypes?: string[],
}

export async function selectBuildCommand(context: IActionContext, folder: vscode.WorkspaceFolder, dockerfile: string, buildContext: string): Promise<CommandResponse<void>> {
    return await selectCommandTemplate(
        context,
        'build',
        [folder.name, dockerfile],
        folder,
        { 'dockerfile': dockerfile, 'context': buildContext, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectRunCommand(context: IActionContext, fullTag: string, interactive: boolean, exposedPorts?: PortBinding[]): Promise<CommandResponse<void>> {
    let portsString: string = '';
    if (exposedPorts) {
        portsString = exposedPorts.map(pb => `-p ${pb.containerPort}:${pb.containerPort}${pb.protocol ? '/' + pb.protocol : ''}`).join(' ');
    }

    return await selectCommandTemplate(
        context,
        interactive ? 'runInteractive' : 'run',
        [fullTag],
        undefined,
        { 'tag': fullTag, 'exposedPorts': portsString, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectAttachCommand(context: IActionContext, containerName: string, imageName: string, containerId: string, shellCommand: string): Promise<CommandResponse<void>> {
    return await selectCommandTemplate(
        context,
        'attach',
        [containerName, imageName],
        undefined,
        { 'containerId': containerId, 'shellCommand': shellCommand, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectLogsCommand(context: IActionContext, containerName: string, imageName: string, containerId: string): Promise<CommandResponse<void>> {
    return await selectCommandTemplate(
        context,
        'logs',
        [containerName, imageName],
        undefined,
        { 'containerId': containerId, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectComposeCommand(context: IActionContext, folder: vscode.WorkspaceFolder, composeCommand: 'up' | 'down' | 'upSubset', configurationFile?: string, detached?: boolean, build?: boolean): Promise<CommandResponse<void>> {
    let template: TemplateCommand;

    switch (composeCommand) {
        case 'up':
            template = 'composeUp';
            break;
        case 'down':
            template = 'composeDown';
            break;
        case 'upSubset':
        default:
            template = 'composeUpSubset';
            break;
    }

    // Docker Compose needs a little special handling, because the command can either be `docker-compose` (compose v1)
    // or `docker` + first argument `compose` (compose v2)
    // Command customization wants the answer to that as one string
    let fullComposeCommand: string;
    const orchestratorClient = await ext.orchestratorManager.getClient();
    if (isDockerComposeClient(orchestratorClient) && orchestratorClient.composeV2) {
        fullComposeCommand = `${orchestratorClient.commandName} compose`;
    } else {
        fullComposeCommand = orchestratorClient.commandName;
    }

    return await selectCommandTemplate(
        context,
        template,
        [folder.name, configurationFile],
        folder,
        { 'configurationFile': configurationFile ? `-f "${configurationFile}"` : '', 'detached': detached ? '-d' : '', 'build': build ? '--build' : '', 'composeCommand': fullComposeCommand }
    );
}

// Exported only for tests
export async function selectCommandTemplate(
    actionContext: IActionContext,
    command: TemplateCommand,
    matchContext: string[],
    folder: vscode.WorkspaceFolder | undefined,
    additionalVariables: { [key: string]: string },
    // The following three are overridable for test purposes, but have default values that cover actual usage
    templatePicker: TemplatePicker = (i, o) => actionContext.ui.showQuickPick(i, o), // Default is the normal ext.ui.showQuickPick (this longer syntax is because doing `ext.ui.showQuickPick` alone doesn't result in the right `this` further down)
    getCommandSettings: () => CommandSettings = () => vscode.workspace.getConfiguration('docker').inspect<string | CommandTemplate[]>(`commands.${command}`),
    getContextManager: () => IContextManager = () => ext.runtimeManager.contextManager
): Promise<CommandResponse<void>> {
    // Get the current context type
    let currentContextType = (await getContextManager().getCurrentContext())?.type;
    if (!currentContextType || currentContextType === 'containerd') { // For backwards compatibility, treat 'containerd' as 'moby'
        currentContextType = 'moby';
    }

    // Get the configured settings values
    const commandSettings = getCommandSettings();
    const userTemplates: CommandTemplate[] = toCommandTemplateArray(commandSettings.workspaceFolderValue ?? commandSettings.workspaceValue ?? commandSettings.globalValue);
    const defaultTemplates: CommandTemplate[] = toCommandTemplateArray(commandSettings.defaultValue);

    // Defense-in-depth: Reject if the workspace is untrusted but user templates from a workspace or workspace folder showed up somehow
    if (!vscode.workspace.isTrusted && (commandSettings.workspaceFolderValue || commandSettings.workspaceValue)) {
        throw new UserCancelledError('enforceTrust');
    }

    // Build the template selection matrix. Settings-defined values are preferred over default, and constrained over unconstrained.
    // Constrained templates have either `match` or `contextTypes`, and must match the constraints.
    // Unconstrained templates have neither `match` nor `contextTypes`.
    const templateMatrix: CommandTemplate[][] = [];

    // 0. Workspace- or user-defined templates with either `match` or `contextTypes`, that satisfy the constraints
    templateMatrix.push(getConstrainedTemplates(actionContext, userTemplates, matchContext, currentContextType));

    // 1. Workspace- or user-defined templates with neither `match` nor `contextTypes`
    templateMatrix.push(getUnconstrainedTemplates(userTemplates));

    // 2. Default templates with either `match` or `contextTypes`, that satisfy the constraints
    templateMatrix.push(getConstrainedTemplates(actionContext, defaultTemplates, matchContext, currentContextType));

    // 3. Default templates with neither `match` nor `contextTypes`
    templateMatrix.push(getUnconstrainedTemplates(defaultTemplates));

    // Select the template to use
    let selectedTemplate: CommandTemplate;
    for (const templates of templateMatrix) {
        // Skip any empty group
        if (templates.length === 0) {
            continue;
        }

        // Choose a template from the first non-empty group
        // If only one matches there will be no prompt
        selectedTemplate = await quickPickTemplate(templates, templatePicker);
        break;
    }

    if (!selectedTemplate) {
        throw new Error(localize('vscode-docker.commands.selectCommandTemplate.noTemplate', 'No command template was found for command \'{0}\'', command));
    }

    actionContext.telemetry.properties.isDefaultCommand = defaultTemplates.some(t => t.template === selectedTemplate.template) ? 'true' : 'false';
    actionContext.telemetry.properties.isCommandRegexMatched = selectedTemplate.match ? 'true' : 'false';
    actionContext.telemetry.properties.commandContextType = `[${selectedTemplate.contextTypes?.join(', ') ?? ''}]`;
    actionContext.telemetry.properties.currentContextType = currentContextType;

    // TODO: runtimes: This is not really ideal (putting the full command line into `command` instead of `command` + `args`), but parsing a string into a command like that is really hard
    // Fortunately, `TaskCommandRunnerFactory` does not really care
    return {
        command: resolveVariables(selectedTemplate.template, folder, additionalVariables),
        args: undefined,
        parse: undefined,
    };
}

async function quickPickTemplate(templates: CommandTemplate[], templatePicker: TemplatePicker): Promise<CommandTemplate> {
    if (templates.length === 1) {
        // No need to prompt if only one remains
        return templates[0];
    }

    const items: IAzureQuickPickItem<CommandTemplate>[] = templates.map(template => {
        return {
            label: template.label,
            detail: template.template,
            data: template,
        };
    });

    const selection = await templatePicker(items, {
        placeHolder: localize('vscode-docker.commands.selectCommandTemplate.chooseTemplate', 'Choose a command template to execute')
    });

    return selection.data;
}

function getConstrainedTemplates(actionContext: IActionContext, templates: CommandTemplate[], matchContext: string[], currentContextType: string): CommandTemplate[] {
    return templates.filter(template => {
        if (!template.contextTypes && !template.match) {
            // If neither contextTypes nor match is defined, this is an unconstrained template
            return false;
        }

        return isContextTypeConstraintSatisfied(currentContextType, template.contextTypes) &&
            isMatchConstraintSatisfied(actionContext, matchContext, template.match);
    });
}

function getUnconstrainedTemplates(templates: CommandTemplate[]): CommandTemplate[] {
    return templates.filter(template => {
        // Both contextTypes and match must be falsy to make this an unconstrained template
        return !template.contextTypes && !template.match;
    });
}

function isContextTypeConstraintSatisfied(currentContextType: string, templateContextTypes: string[] | undefined): boolean {
    if (!templateContextTypes) {
        // If templateContextTypes is undefined or empty, it is automatically satisfied
        return true;
    }

    return templateContextTypes.some(tc => tc === currentContextType);
}

function isMatchConstraintSatisfied(actionContext: IActionContext, matchContext: string[], match: string | undefined): boolean {
    if (!match) {
        // If match is undefined or empty, it is automatically satisfied
        return true;
    }

    try {
        const matcher = new RegExp(match, 'i');
        return matchContext.some(m => matcher.test(m));
    } catch {
        // Don't wait
        void actionContext.ui.showWarningMessage(localize('vscode-docker.commands.selectCommandTemplate.invalidMatch', 'Invalid match expression \'{0}\'. This template will be skipped.', match));
    }

    return false;
}

function toCommandTemplateArray(maybeTemplateArray: CommandTemplate[] | string | undefined): CommandTemplate[] {
    if (typeof (maybeTemplateArray) === 'string') {
        return [{ template: maybeTemplateArray }] as CommandTemplate[];
    } else if (!maybeTemplateArray) {
        // If templateSetting is some falsy value, make this an empty array so the default gets used
        return [];
    }

    return maybeTemplateArray;
}
