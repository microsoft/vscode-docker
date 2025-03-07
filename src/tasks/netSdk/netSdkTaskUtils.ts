/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { RunContainerBindMount, RunContainerCommandOptions, Shell, composeArgs, withArg, withNamedArg } from "@microsoft/vscode-container-client";
import * as os from 'os';
import { vsDbgInstallBasePath } from "../../debugging/netcore/VsDbgHelper";
import { ext } from "../../extensionVariables";
import { getImageNameWithTag } from "../../utils/getValidImageName";
import { getDockerOSType } from "../../utils/osUtils";
import { defaultVsCodeLabels } from "../TaskDefinitionBase";
import { getDefaultContainerName } from '../TaskHelper';

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

export async function getNetSdkBuildCommand(): Promise<string> {
    const args = composeArgs(
        withArg('dotnet', 'publish'),
        withNamedArg('--os', await normalizeOsToRidOs()),
        withNamedArg('--arch', await normalizeArchitectureToRidArchitecture()),
        withArg('/t:PublishContainer'),
        withNamedArg('--configuration', 'Debug'),
        withNamedArg('-p:ContainerImageTag', NetSdkDefaultImageTag, { assignValue: true })
    )();

    const quotedArgs = Shell.getShellOrDefault().quote(args);
    return quotedArgs.join(' ');
}

export async function getNetSdkRunCommand(imageName: string): Promise<string> {
    const client = await ext.runtimeManager.getClient();

    const options: RunContainerCommandOptions = {
        detached: true,
        publishAllPorts: true,
        name: getDefaultContainerName(imageName, NetSdkDefaultImageTag),
        environmentVariables: {},
        removeOnExit: true,
        imageRef: getImageNameWithTag(imageName, NetSdkDefaultImageTag),
        labels: defaultVsCodeLabels,
        mounts: await getRemoteDebuggerMount(),
        entrypoint: await getDockerOSType() === 'windows' ? 'cmd.exe' : '/bin/sh'
    };

    const command = await client.runContainer(options);
    const quotedArgs = Shell.getShellOrDefault().quote(command.args);
    const commandLine = [client.commandName, ...quotedArgs].join(' ');
    return commandLine;
}

/**
 * This method normalizes the Docker OS type to match the .NET Core SDK conventions.
 * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
 */
export async function normalizeOsToRidOs(): Promise<'linux' | 'win'> {
    const dockerOsType = await getDockerOSType();
    return dockerOsType === 'windows' ? 'win' : 'linux';
}

/**
 * This method normalizes the native architecture to match the .NET Core SDK conventions.
 * {@link https://learn.microsoft.com/en-us/dotnet/core/rid-catalog}
 */
export async function normalizeArchitectureToRidArchitecture(): Promise<RidCpuArchitecture> {
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


