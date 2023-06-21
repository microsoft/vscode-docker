/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from '@microsoft/vscode-azext-utils';
import * as os from 'os';
import { WorkspaceFolder } from "vscode";
import { vsDbgInstallBasePath } from "../../debugging/netcore/VsDbgHelper";
import { ext } from "../../extensionVariables";
import { RunContainerBindMount, Shell, composeArgs, withArg, withNamedArg } from "../../runtimes/docker";
import { getValidImageName } from "../../utils/getValidImageName";
import { getDockerOSType } from "../../utils/osUtils";
import { Item, quickPickCsProjFileItem } from "../../utils/quickPickFile";
import { defaultVsCodeLabels } from "../TaskDefinitionBase";
import { DockerTaskExecutionContext, getDefaultContainerName, getDefaultImageName } from "../TaskHelper";
import { NetCoreTaskHelper } from '../netcore/NetCoreTaskHelper';

/**
 * Native architecture of the current machine in the RID format
 * {@link https://github.com/dotnet/runtime/blob/main/src/libraries/Microsoft.NETCore.Platforms/src/runtime.json}
 */
export type RidCpuArchitecture =
    | 'x64'
    | 'x86'
    | 'arm64'
    | 'arm'
    | 'ppc64le'
    | 'mips64'
    | 's390x'
    | string;

export const NetSdkRunTaskType = 'dotnet-container-sdk';
const NetSdkDefaultImageTag = 'dev'; // intentionally default to dev tag for phase 1 of this feature

export async function getNetSdkBuildCommand(context: DockerTaskExecutionContext): Promise<string> {

    const configuration = 'Debug'; // intentionally default to Debug configuration for phase 1 of this feature
    // {@link https://github.com/dotnet/sdk-container-builds/issues/141} this could change in the future
    const publishFlag = NetCoreTaskHelper.isWebApp(context.folder.uri.fsPath) ? '-p:PublishProfile=DefaultContainer' : '/t:PublishContainer';

    const args = composeArgs(
        withArg('dotnet', 'publish'),
        withNamedArg('--os', await normalizeOsToRidOs()),
        withNamedArg('--arch', await normalizeArchitectureToRidArchitecture()),
        withArg(publishFlag),
        withNamedArg('--configuration', configuration),
        withNamedArg('-p:ContainerImageName', getValidImageName(context.folder.name), { assignValue: true }),
        withNamedArg('-p:ContainerImageTag', NetSdkDefaultImageTag, { assignValue: true })
    )();

    const quotedArgs = Shell.getShellOrDefault().quote(args);
    return quotedArgs.join(' ');
}

export async function getNetSdkRunCommand(context: DockerTaskExecutionContext): Promise<string> {
    const client = await ext.runtimeManager.getClient();

    const command = await client.runContainer({
        detached: true,
        publishAllPorts: true,
        name: getDefaultContainerName(context.folder.name, NetSdkDefaultImageTag),
        environmentVariables: {},
        removeOnExit: true,
        imageRef: getDefaultImageName(context.folder.name, NetSdkDefaultImageTag),
        labels: defaultVsCodeLabels,
        mounts: await getRemoteDebuggerMount(),
        exposePorts: [8080, 80], // the default port is 8080 for .NET 8 and 80 for .NET 7
        entrypoint: '/bin/sh'
    });

    const quotedArgs = Shell.getShellOrDefault().quote(command.args);
    const commandLine = [client.commandName, ...quotedArgs].join(' ');
    return commandLine;
}

export async function inferProjPath(context: IActionContext, folder: WorkspaceFolder): Promise<Item> {
    if (ext.context.workspaceState.get<Item | undefined>('netSdkProjPath')) {
        return ext.context.workspaceState.get<Item | undefined>('netSdkProjPath');
    }

    const projFileItem = (await quickPickCsProjFileItem(context, undefined, folder, 'No .csproj file could be found.'));
    await ext.context.workspaceState.update('netSdkProjPath', projFileItem); // save the path for future use
    return projFileItem;
}

/**
 * This method normalizes the Docker OS type to match the .NET Core SDK conventions.
 * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
 */
async function normalizeOsToRidOs(): Promise<'linux' | 'win'> {
    const dockerOsType = await getDockerOSType();
    return dockerOsType === 'windows' ? 'win' : 'linux';
}

/**
 * This method normalizes the native architecture to match the .NET Core SDK conventions.
 * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
 */
async function normalizeArchitectureToRidArchitecture(): Promise<RidCpuArchitecture> {
    const architecture = os.arch();
    switch (architecture) {
        case 'x32':
        case 'ia32':
            return 'x86';
        default:
            return architecture;
    }
}

/**
 * This methods returns the mount for the remote debugger ONLY as the SDK built container will have
 * everything it needs to run the app already inside.
 */
async function getRemoteDebuggerMount(): Promise<RunContainerBindMount[] | undefined> {
    const debuggerVolume: RunContainerBindMount = {
        type: 'bind',
        source: vsDbgInstallBasePath,
        destination: await getDockerOSType() === 'windows' ? 'C:\\remote_debugger' : '/remote_debugger',
        readOnly: true
    };
    return [debuggerVolume];
}


