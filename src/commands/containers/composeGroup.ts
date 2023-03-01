/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as path from 'path';
import { l10n } from 'vscode';
import { ext } from '../../extensionVariables';
import { CommonOrchestratorCommandOptions, IContainerOrchestratorClient, LogsCommandOptions, VoidCommandResponse } from '../../runtimes/docker';
import { TaskCommandRunnerFactory } from '../../runtimes/runners/TaskCommandRunnerFactory';
import { ContainerGroupTreeItem } from '../../tree/containers/ContainerGroupTreeItem';
import { ContainerTreeItem } from '../../tree/containers/ContainerTreeItem';

export async function composeGroupLogs(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    // Since we're not interested in the output, we can pretend this is a `VoidCommandResponse`
    return composeGroup<LogsCommandOptions>(context, (client, options) => client.logs(options) as Promise<VoidCommandResponse>, node, { follow: true, tail: 1000 });
}

export async function composeGroupStart(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    return composeGroup(context, (client, options) => client.start(options), node);
}

export async function composeGroupStop(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    return composeGroup(context, (client, options) => client.stop(options), node);
}

export async function composeGroupRestart(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    return composeGroup(context, (client, options) => client.restart(options), node);
}

export async function composeGroupDown(context: IActionContext, node: ContainerGroupTreeItem): Promise<void> {
    return composeGroup(context, (client, options) => client.down(options), node);
}

type AdditionalOptions<TOptions extends CommonOrchestratorCommandOptions> = Omit<TOptions, keyof CommonOrchestratorCommandOptions>;

async function composeGroup<TOptions extends CommonOrchestratorCommandOptions>(
    context: IActionContext,
    composeCommandCallback: (client: IContainerOrchestratorClient, options: TOptions) => Promise<VoidCommandResponse>,
    node: ContainerGroupTreeItem,
    additionalOptions?: AdditionalOptions<TOptions>
): Promise<void> {
    if (!node) {
        await ext.containersTree.refresh(context);
        node = await ext.containersTree.showTreeItemPicker<ContainerGroupTreeItem>(/composeGroup$/i, {
            ...context,
            noItemFoundErrorMessage: l10n.t('No Docker Compose projects are running.'),
        });
    }

    const workingDirectory = getComposeWorkingDirectory(node);
    const orchestratorFiles = getComposeFiles(node);
    const projectName = getComposeProjectName(node);
    const envFile = getComposeEnvFile(node);

    if (!workingDirectory || !orchestratorFiles || !projectName) {
        context.errorHandling.suppressReportIssue = true;
        throw new Error(l10n.t('Unable to determine compose project info for container group \'{0}\'.', node.label));
    }

    const options: TOptions = {
        files: orchestratorFiles,
        projectName: projectName,
        environmentFile: envFile,
        ...additionalOptions,
    } as TOptions;

    const client = await ext.orchestratorManager.getClient();
    const taskCRF = new TaskCommandRunnerFactory({
        taskName: client.displayName,
        cwd: workingDirectory,
    });

    await taskCRF.getCommandRunner()(composeCommandCallback(client, options));
}

function getComposeWorkingDirectory(node: ContainerGroupTreeItem): string | undefined {
    // Find a container with the `com.docker.compose.project.working_dir` label, which gives the working directory in which to execute the compose command
    const container = (node.ChildTreeItems as ContainerTreeItem[]).find(c => c.labels?.['com.docker.compose.project.working_dir']);
    return container?.labels?.['com.docker.compose.project.working_dir'];
}

function getComposeFiles(node: ContainerGroupTreeItem): string[] | undefined {
    // Find a container with the `com.docker.compose.project.config_files` label, which gives all the compose files (within the working directory) used to up this container
    const container = (node.ChildTreeItems as ContainerTreeItem[]).find(c => c.labels?.['com.docker.compose.project.config_files']);

    // Paths may be subpaths, but working dir generally always directly contains the config files, so unless the file is already absolute, let's cut off the subfolder and get just the file name
    // (In short, the working dir may not be the same as the cwd when the docker-compose up command was called, BUT the files are relative to that cwd)
    // Note, it appears compose v2 *always* uses absolute paths, both for this and `working_dir`
    return container?.labels?.['com.docker.compose.project.config_files']
        ?.split(',')
        ?.map(f => path.isAbsolute(f) ? f : path.parse(f).base);
}

function getComposeProjectName(node: ContainerGroupTreeItem): string | undefined {
    // Find a container with the `com.docker.compose.project` label, which gives the project name
    const container = (node.ChildTreeItems as ContainerTreeItem[]).find(c => c.labels?.['com.docker.compose.project']);
    return container?.labels?.['com.docker.compose.project'];
}

function getComposeEnvFile(node: ContainerGroupTreeItem): string | undefined {
    // Find a container with the `com.docker.compose.project.environment_file` label, which gives the environment file absolute path
    const container = (node.ChildTreeItems as ContainerTreeItem[]).find(c => c.labels?.['com.docker.compose.project.environment_file']);
    return container?.labels?.['com.docker.compose.project.environment_file'];
}
