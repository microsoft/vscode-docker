/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext, IAzureQuickPickItem, IAzureQuickPickOptions, UserCancelledError } from '@microsoft/vscode-azext-utils';
import * as vscode from 'vscode';
import { ext } from '../extensionVariables';
import { PortBinding, VoidCommandResponse } from '../runtimes/docker';
import { isDockerComposeClient } from '../runtimes/OrchestratorRuntimeManager';
import { resolveVariables } from '../utils/resolveVariables';

type TemplateCommand = 'build' | 'run' | 'runInteractive' | 'attach' | 'logs' | 'composeUp' | 'composeDown' | 'composeUpSubset';

type TemplatePicker = (items: IAzureQuickPickItem<CommandTemplate>[], options: IAzureQuickPickOptions) => Promise<IAzureQuickPickItem<CommandTemplate>>;

interface CommandSettings {
    defaultValue?: CommandTemplate[] | string;
    globalValue?: CommandTemplate[] | string;
    workspaceValue?: CommandTemplate[] | string;
    workspaceFolderValue?: CommandTemplate[] | string;
}

// Exported only for tests
export interface CommandTemplate {
    template: string;
    label: string;
    match?: string;
}

export async function selectBuildCommand(context: IActionContext, folder: vscode.WorkspaceFolder, dockerfile: string, buildContext: string): Promise<VoidCommandResponse> {
    return await selectCommandTemplate(
        context,
        'build',
        [folder.name, dockerfile],
        folder,
        { 'dockerfile': dockerfile, 'context': buildContext, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectRunCommand(context: IActionContext, fullTag: string, interactive: boolean, exposedPorts?: PortBinding[]): Promise<VoidCommandResponse> {
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

export async function selectAttachCommand(context: IActionContext, containerName: string, imageName: string, containerId: string, shellCommand: string): Promise<VoidCommandResponse> {
    return await selectCommandTemplate(
        context,
        'attach',
        [containerName, imageName],
        undefined,
        { 'containerId': containerId, 'shellCommand': shellCommand, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectLogsCommand(context: IActionContext, containerName: string, imageName: string, containerId: string): Promise<VoidCommandResponse> {
    return await selectCommandTemplate(
        context,
        'logs',
        [containerName, imageName],
        undefined,
        { 'containerId': containerId, 'containerCommand': await ext.runtimeManager.getCommand() }
    );
}

export async function selectComposeCommand(context: IActionContext, folder: vscode.WorkspaceFolder, composeCommand: 'up' | 'down' | 'upSubset', configurationFile?: string, detached?: boolean, build?: boolean): Promise<VoidCommandResponse> {
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
    getCommandSettings: () => CommandSettings = () => vscode.workspace.getConfiguration('docker').inspect<string | CommandTemplate[]>(`commands.${command}`)
): Promise<VoidCommandResponse> {
    // Get the configured settings values
    const commandSettings = getCommandSettings();
    const userTemplates: CommandTemplate[] = toCommandTemplateArray(commandSettings.workspaceFolderValue ?? commandSettings.workspaceValue ?? commandSettings.globalValue);
    const defaultTemplates: CommandTemplate[] = toCommandTemplateArray(commandSettings.defaultValue);

    // Defense-in-depth: Reject if the workspace is untrusted but user templates from a workspace or workspace folder showed up somehow
    if (!vscode.workspace.isTrusted && (commandSettings.workspaceFolderValue || commandSettings.workspaceValue)) {
        throw new UserCancelledError('enforceTrust');
    }

    // Build the template selection matrix. Settings-defined values are preferred over default, and constrained over unconstrained.
    // Constrained templates have `match`, and must match the constraints.
    // Unconstrained templates do not have `match`.
    const templateMatrix: CommandTemplate[][] = [];

    // 0. Workspace- or user-defined templates with `match`, that satisfy the constraints
    templateMatrix.push(getConstrainedTemplates(actionContext, userTemplates, matchContext));

    // 1. Workspace- or user-defined templates without `match`
    templateMatrix.push(getUnconstrainedTemplates(userTemplates));

    // 2. Default templates with either `match`, that satisfy the constraints
    templateMatrix.push(getConstrainedTemplates(actionContext, defaultTemplates, matchContext));

    // 3. Default templates without `match`
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
        throw new Error(vscode.l10n.t('No command template was found for command \'{0}\'', command));
    }

    actionContext.telemetry.properties.isDefaultCommand = defaultTemplates.some(t => t.template === selectedTemplate.template) ? 'true' : 'false';
    actionContext.telemetry.properties.isCommandRegexMatched = selectedTemplate.match ? 'true' : 'false';

    // This is not really ideal (putting the full command line into `command` instead of `command` + `args`), but parsing a string into a command + args like that is really hard
    // Fortunately, `TaskCommandRunnerFactory` does not really care
    return {
        command: resolveVariables(selectedTemplate.template, folder, additionalVariables),
        args: undefined,
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
        placeHolder: vscode.l10n.t('Choose a command template to execute')
    });

    return selection.data;
}

function getConstrainedTemplates(actionContext: IActionContext, templates: CommandTemplate[], matchContext: string[]): CommandTemplate[] {
    return templates.filter(template => {
        if (!template.match) {
            // If match is not defined, this is an unconstrained template
            return false;
        }

        return isMatchConstraintSatisfied(actionContext, matchContext, template.match);
    });
}

function getUnconstrainedTemplates(templates: CommandTemplate[]): CommandTemplate[] {
    return templates.filter(template => {
        // `match` must be falsy to make this an unconstrained template
        return !template.match;
    });
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
        void actionContext.ui.showWarningMessage(vscode.l10n.t('Invalid match expression \'{0}\'. This template will be skipped.', match));
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
