/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PromiseCommandResponse, VoidCommandResponse } from "../../contracts/CommandRunner";
import { IContainersClient, InspectContextsCommandOptions, InspectContextsItem, ListContextItem, ListContextsCommandOptions, RemoveContextsCommandOptions, UseContextCommandOptions } from "../../contracts/ContainerClient";
import { asIds } from "../../utils/asIds";
import { CommandLineArgs, composeArgs, withArg } from "../../utils/commandLineBuilder";
import { DockerClientBase } from "../DockerClientBase/DockerClientBase";
import { withDockerJsonFormatArg } from "../DockerClientBase/withDockerJsonFormatArg";
import { isDockerContextRecord } from "./DockerContextRecord";
import { isDockerInspectContextRecord } from "./DockerInspectContextRecord";

export class DockerClient extends DockerClientBase implements IContainersClient {
    /**
     * The ID of the Docker client
     */
    public static ClientId = 'com.microsoft.visualstudio.containers.docker';

    /**
     * Constructs a new {@link DockerClient}
     * @param commandName (Optional, default `docker`) The command that will be run
     * as the base command. If quoting is necessary, it is the responsibility of the
     * caller to add.
     * @param displayName (Optional, default 'Docker') The human-friendly display
     * name of the client
     * @param description (Optional, with default) The human-friendly description of
     * the client
     */
    public constructor(
        commandName: string = 'docker',
        displayName: string = 'Docker',
        description: string = 'Runs container commands using the Docker CLI'
    ) {
        super(
            DockerClient.ClientId,
            commandName,
            displayName,
            description
        );
    }

    //#region Context Commands

    //#region ListContexts Command

    private getListContextsCommandArgs(options: ListContextsCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('context', 'ls'),
            withDockerJsonFormatArg,
        )();
    }

    private async parseListContextsCommandOutput(
        output: string,
        strict: boolean,
    ): Promise<ListContextItem[]> {
        const contexts = new Array<ListContextItem>();
        try {
            // Docker returns JSON per-line output, so we need to split each line
            // and parse as independent JSON objects
            output.split('\n').forEach((contextJson) => {
                try {
                    // Ignore empty lines when parsing
                    if (!contextJson) {
                        return;
                    }

                    const rawContext = JSON.parse(contextJson);

                    // Validate that the image object matches the expected output
                    // for the list contexts command
                    if (!isDockerContextRecord(rawContext)) {
                        throw new Error('Invalid context JSON');
                    }

                    contexts.push({
                        name: rawContext.Name,
                        current: rawContext.Current,
                        description: rawContext.Description,
                        containerEndpoint: rawContext.DockerEndpoint,
                    });
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }
            });
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return contexts;
    }

    override async listContexts(options: ListContextsCommandOptions): Promise<PromiseCommandResponse<ListContextItem[]>> {
        return {
            command: this.commandName,
            args: this.getListContextsCommandArgs(options),
            parse: this.parseListContextsCommandOutput,
        };
    }

    //#endregion

    //#region RemoveContexts Command

    private getRemoveContextsCommandArgs(options: RemoveContextsCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('context', 'rm'),
            withArg(...options.contexts),
            withArg('--force'),
        )();
    }

    private async parseRemoveContextsCommandOutput(
        output: string,
        strict: boolean,
    ): Promise<string[]> {
        return asIds(output);
    }

    override async removeContexts(options: RemoveContextsCommandOptions): Promise<PromiseCommandResponse<string[]>> {
        return {
            command: this.commandName,
            args: this.getRemoveContextsCommandArgs(options),
            parse: this.parseRemoveContextsCommandOutput,
        };
    }

    //#endregion

    //#region UseContext Command

    private getUseContextCommandArgs(options: UseContextCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('context', 'use'),
            withArg(options.context),
        )();
    }

    override async useContext(options: UseContextCommandOptions): Promise<VoidCommandResponse> {
        return {
            command: this.commandName,
            args: this.getUseContextCommandArgs(options),
        };
    }

    //#endregion

    //#region InspectContexts Command

    private getInspectContextsCommandArgs(options: InspectContextsCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('context', 'inspect'),
            withDockerJsonFormatArg,
            withArg(...options.contexts),
        )();
    }

    private async parseInspectContextsCommandOutput(
        output: string,
        strict: boolean,
    ): Promise<InspectContextsItem[]> {
        try {
            return output.split('\n').reduce<Array<InspectContextsItem>>((volumes, inspectString) => {
                if (!inspectString) {
                    return volumes;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectContextRecord(inspect)) {
                        throw new Error('Invalid context inspect json');
                    }

                    // Return the normalized InspectVolumesItem record
                    const volume: InspectContextsItem = {
                        name: inspect.Name,
                        description: inspect.Metadata?.Description,
                        raw: inspectString,
                    };

                    return [...volumes, volume];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return volumes;
            }, new Array<InspectContextsItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return new Array<InspectContextsItem>();
    }

    override async inspectContexts(options: InspectContextsCommandOptions): Promise<PromiseCommandResponse<InspectContextsItem[]>> {
        return {
            command: this.commandName,
            args: this.getInspectContextsCommandArgs(options),
            parse: this.parseInspectContextsCommandOutput,
        };
    }

    //#endregion

    //#endregion
}
