/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IActionContext } from "@microsoft/vscode-azext-utils";
import { CancellationToken, Task, WorkspaceFolder } from "vscode";
import { composeArgs, withArg, withNamedArg } from "../../runtimes/docker";
import { cloneObject } from "../../utils/cloneObject";
import { DockerPseudoterminal } from "../DockerPseudoterminal";
import { DockerTaskProvider } from "../DockerTaskProvider";
import { throwIfCancellationRequested } from "../TaskHelper";
import { NetCoreSdkBuildDefinitionBase } from "./NetCoreSdkBuildTaskDefinitionBase";

export interface NetCoreSdkBuildContext {
    folder: WorkspaceFolder;
    actionContext?: IActionContext;
    cancellationToken?: CancellationToken;
    terminal: DockerPseudoterminal;
}

export interface NetCoreSdkBuildTask extends Task {
    definition: NetCoreSdkBuildDefinitionBase;
}

export class NetCoreSdkBuildProvider extends DockerTaskProvider {

    public constructor() {
        super('dotnet-sdk-build',);
    }

    protected async executeTaskInternal(context: NetCoreSdkBuildContext, task: NetCoreSdkBuildTask): Promise<void> {
        const buildDefinition = cloneObject(task.definition);
        buildDefinition.netcoreSdkBuild = buildDefinition.netcoreSdkBuild || {};

        // TODO: check to see if netcoreSdkBuild is defined, if not apply defaults to netcoreSdkBuild object through `getNetcoreSdkBuildOptions()`

        throwIfCancellationRequested(context);

        const sdkBuildCommand = composeArgs(
            withArg('dotnet', 'publish'),
            withNamedArg('-os', buildDefinition.netcoreSdkBuild?.os),
            withNamedArg('-arch', buildDefinition.netcoreSdkBuild?.arcitecture),
            withNamedArg('-c', buildDefinition.netcoreSdkBuild?.configuration),
        )();

        const commandLine = sdkBuildCommand.join(' ');
        await context.terminal.execAsyncInTerminal(
            commandLine,
            {
                folder: context.folder,
                token: context.cancellationToken,
            }
        );

        throwIfCancellationRequested(context);

    }

}
