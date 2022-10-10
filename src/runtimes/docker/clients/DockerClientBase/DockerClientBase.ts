/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as dayjs from 'dayjs';
import * as customParseFormat from 'dayjs/plugin/customParseFormat';
import * as utc from 'dayjs/plugin/utc';
import * as path from 'path';
import { ShellQuotedString, ShellQuoting } from 'vscode';
import { CommandResponse } from '../../contracts/CommandRunner';
import {
    BuildImageCommandOptions,
    ContainersStatsCommandOptions,
    CreateNetworkCommandOptions,
    CreateVolumeCommandOptions,
    ExecContainerCommandOptions,
    IContainersClient,
    ImageNameInfo,
    InfoCommandOptions,
    InfoItem,
    InspectContainersCommandOptions,
    InspectContainersItem,
    InspectContainersItemMount,
    InspectContainersItemNetwork,
    InspectContextsCommandOptions,
    InspectContextsItem,
    InspectImagesCommandOptions,
    InspectImagesItem,
    InspectNetworksCommandOptions,
    InspectNetworksItem,
    InspectVolumesCommandOptions,
    InspectVolumesItem,
    ListContainersCommandOptions,
    ListContainersItem,
    ListContextItem,
    ListContextsCommandOptions,
    ListFilesCommandOptions,
    ListFilesItem,
    ListImagesCommandOptions,
    ListImagesItem,
    ListNetworkItem,
    ListNetworksCommandOptions,
    ListVolumeItem,
    ListVolumesCommandOptions,
    LoginCommandOptions,
    LogoutCommandOptions,
    LogsForContainerCommandOptions,
    NetworkIpamConfig,
    PortBinding,
    PruneContainersCommandOptions,
    PruneContainersItem,
    PruneImagesCommandOptions,
    PruneImagesItem,
    PruneNetworksCommandOptions,
    PruneNetworksItem,
    PruneVolumesCommandOptions,
    PruneVolumesItem,
    PullImageCommandOptions,
    PushImageCommandOptions,
    ReadFileCommandOptions,
    RemoveContainersCommandOptions,
    RemoveContextsCommandOptions,
    RemoveImagesCommandOptions,
    RemoveNetworksCommandOptions,
    RemoveVolumesCommandOptions,
    RestartContainersCommandOptions,
    RunContainerCommandOptions,
    StartContainersCommandOptions,
    StopContainersCommandOptions,
    TagImageCommandOptions,
    UseContextCommandOptions,
    VersionCommandOptions,
    VersionItem,
    WriteFileCommandOptions
} from "../../contracts/ContainerClient";
import { asIds } from '../../utils/asIds';
import {
    CommandLineArgs,
    composeArgs,
    withArg,
    withFlagArg,
    withNamedArg,
    withQuotedArg,
} from "../../utils/commandLineBuilder";
import { CommandNotSupportedError } from '../../utils/CommandNotSupportedError';
import { toArray } from '../../utils/toArray';
import { ConfigurableClient } from '../ConfigurableClient';
import { DockerInfoRecord, isDockerInfoRecord } from './DockerInfoRecord';
import { DockerInspectContainerRecord, isDockerInspectContainerRecord } from './DockerInspectContainerRecord';
import { DockerInspectImageRecord, isDockerInspectImageRecord } from './DockerInspectImageRecord';
import { DockerInspectNetworkRecord, isDockerInspectNetworkRecord } from './DockerInspectNetworkRecord';
import { DockerInspectVolumeRecord, isDockerInspectVolumeRecord } from './DockerInspectVolumeRecord';
import { DockerListContainerRecord, isDockerListContainerRecord } from './DockerListContainerRecord';
import { isDockerListImageRecord } from "./DockerListImageRecord";
import { DockerNetworkRecord, isDockerNetworkRecord } from './DockerNetworkRecord';
import { isDockerVersionRecord } from "./DockerVersionRecord";
import { isDockerVolumeRecord } from './DockerVolumeRecord';
import { goTemplateJsonFormat, GoTemplateJsonFormatOptions, goTemplateJsonProperty } from './goTemplateJsonFormat';
import { parseDockerLikeImageName } from './parseDockerLikeImageName';
import { parseDockerLikeLabels } from './parseDockerLikeLabels';
import { parseDockerRawPortString } from './parseDockerRawPortString';
import { parseListFilesCommandLinuxOutput, parseListFilesCommandWindowsOutput } from './parseListFilesCommandOutput';
import { tryParseSize } from './tryParseSize';
import { withContainerPathArg } from './withContainerPathArg';
import { withDockerAddHostArg } from './withDockerAddHostArg';
import { withDockerBuildArg } from './withDockerBuildArg';
import { withDockerEnvArg } from './withDockerEnvArg';
import { withDockerJsonFormatArg } from "./withDockerJsonFormatArg";
import { withDockerLabelFilterArgs } from "./withDockerLabelFilterArgs";
import { withDockerLabelsArg } from "./withDockerLabelsArg";
import { withDockerMountsArg } from './withDockerMountsArg';
import { withDockerNoTruncArg } from "./withDockerNoTruncArg";
import { withDockerPortsArg } from './withDockerPortsArg';

dayjs.extend(customParseFormat);
dayjs.extend(utc);

export abstract class DockerClientBase extends ConfigurableClient implements IContainersClient {
    /**
     * The default registry for Docker-like clients is docker.io AKA Docker Hub
     */
    public readonly defaultRegistry: string = 'docker.io';

    /**
     * The default tag for Docker-like clients is 'latest'
     */
    public readonly defaultTag: string = 'latest';

    private listDateFormat: string = 'YYYY-MM-DD HH:mm:ss ZZ';

    //#region Information Commands

    protected getInfoCommandArgs(
        options: InfoCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInfoRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('info'),
            withNamedArg(
                '--format',
                // By specifying an explicit Go template format output, we're able to use the same normalization logic
                // for both Docker and Podman clients
                goTemplateJsonFormat<DockerInfoRecord>(
                    options.shellProvider, {
                    OperatingSystem: goTemplateJsonProperty`.OperatingSystem`,
                    OSType: goTemplateJsonProperty`.OSType`,
                    Raw: goTemplateJsonProperty`.`,
                },
                    formatOverrides,
                ),
            ),
        )();
    }

    protected async parseInfoCommandOutput(output: string, strict: boolean): Promise<InfoItem> {
        const info = JSON.parse(output);

        if (!isDockerInfoRecord(info)) {
            throw new Error('Invalid info JSON');
        }

        return {
            operatingSystem: info.OperatingSystem,
            osType: info.OSType,
            raw: info.Raw,
        };
    }

    async info(options: InfoCommandOptions): Promise<CommandResponse<InfoItem>> {
        return {
            command: this.commandName,
            args: this.getInfoCommandArgs(options),
            parse: this.parseInfoCommandOutput,
        };
    }

    /**
     * Get the command line arguments for a Docker-like client version command
     * @param options Standard version command options
     * @returns Command line args for getting version information from a Docker-like client
     */
    protected getVersionCommandArgs(options: VersionCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('version'),
            withDockerJsonFormatArg,
        )();
    }

    /**
     * Parse/normalize the output from running a Docker-like client version command
     * @param output The standard out from invoking the version command
     * @param strict Use strict parsing to validate the command?
     * @returns
     */
    protected async parseVersionCommandOutput(output: string, strict: boolean): Promise<VersionItem> {
        const version = JSON.parse(output);
        if (!isDockerVersionRecord(version)) {
            throw new Error('Invalid version JSON');
        }

        return {
            client: version.Client.ApiVersion,
            server: version.Server.ApiVersion,
        };
    }

    /**
     * Version command implementation for Docker-like clients
     * @param options Standard version command options
     * @returns A CommandResponse object indicating how to run and parse a version command for this runtime
     */
    async version(options: VersionCommandOptions): Promise<CommandResponse<VersionItem>> {
        return {
            command: this.commandName,
            args: this.getVersionCommandArgs(options),
            parse: this.parseVersionCommandOutput,
        };
    }

    //#endregion

    //#region Auth Commands

    protected getLoginCommandArgs(options: LoginCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('login'),
            withNamedArg('--username', options.username),
            withArg('--password-stdin'),
            withArg(options.registry),
        )();
    }

    async login(options: LoginCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getLoginCommandArgs(options),
        };
    }

    protected getLogoutCommandArgs(options: LogoutCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('logout'),
            withArg(options.registry),
        )();
    }

    async logout(options: LogoutCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getLogoutCommandArgs(options),
        };
    }

    //#endregion

    //#region Image Commands

    //#region BuildImage Command

    /**
     * Get build image command arguments for the current runtime
     * @param options Standard build image command options
     * @returns Command line args for running a build image command on the current runtime
     */
    protected getBuildImageCommandArgs(options: BuildImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'build'),
            withFlagArg('--pull', options.pull),
            withNamedArg('--file', options.file),
            withNamedArg('--target', options.stage),
            withNamedArg('--tag', options.tags),
            withNamedArg(
                '--disable-content-trust',
                typeof options.disableContentTrust === 'boolean'
                    ? options.disableContentTrust.toString()
                    : options.disableContentTrust),
            withDockerLabelsArg(options.labels),
            withNamedArg('--iidfile', options.imageIdFile),
            withDockerBuildArg(options.args),
            withArg(options.customOptions),
            withQuotedArg(options.path),
        )();
    }

    /**
     * Implements the build image command for a Docker-like runtime
     * @param options Standard build image command options
     * @returns A CommandResponse object that can be used to invoke and parse the build image command for the current runtime
     */
    async buildImage(options: BuildImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getBuildImageCommandArgs(options),
        };
    }

    //#endregion

    //#region ListImages Command

    /**
     * Get list images command arguments for the current runtime
     * @param options The process that runs the list images command for a given runtime
     * @returns Command line args for running a list image command on the current runtime
     */
    protected getListImagesCommandArgs(options: ListImagesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'ls'),
            withFlagArg('--all', options.all),
            withNamedArg(
                '--filter',
                typeof options.dangling === 'boolean'
                    ? `dangling=${options.dangling}`
                    : undefined),
            withNamedArg('--filter', options.references?.map((reference) => `reference=${reference}`)),
            withDockerLabelFilterArgs(options.labels),
            withDockerNoTruncArg,
            withDockerJsonFormatArg,
        )();
    }

    /**
     * Parse and normalize the standard out from a Docker-like list images command
     * @param options List images command options
     * @param output The standard out from the list images command
     * @param strict Should the output be strictly parsed?
     * @returns A normalized array of ListImagesItem records
     */
    protected async parseListImagesCommandOutput(
        options: ListImagesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<ListImagesItem>> {
        const images = new Array<ListImagesItem>();
        try {
            // Docker returns JSON per-line output, so we need to split each line
            // and parse as independent JSON objects
            output.split('\n').forEach((imageJson) => {
                try {
                    // Ignore empty lines when parsing
                    if (!imageJson) {
                        return;
                    }

                    const rawImage = JSON.parse(imageJson);

                    // Validate that the image object matches the expected output
                    // for the list images command
                    if (!isDockerListImageRecord(rawImage)) {
                        throw new Error('Invalid image JSON');
                    }

                    const createdAt = dayjs.utc(rawImage.CreatedAt).toDate();
                    const size = tryParseSize(rawImage.Size);

                    images.push({
                        id: rawImage.ID,
                        image: parseDockerLikeImageName(rawImage.Repository),
                        // labels: {}, // TODO: image labels are conspicuously absent from Docker image listing output
                        createdAt,
                        size,
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

        return images;
    }

    /**
     * Generates the necessary information for running and parsing the results
     * of a list image command for a Docker-like client
     * @param options Standard list images command options
     * @returns A CommandResponse indicating how to run and parse/normalize a list image command for a Docker-like client
     */
    async listImages(options: ListImagesCommandOptions): Promise<CommandResponse<Array<ListImagesItem>>> {
        return {
            command: this.commandName,
            args: this.getListImagesCommandArgs(options),
            parse: (output, strict) => this.parseListImagesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region RemoveImages Command

    protected getRemoveImagesCommandArgs(options: RemoveImagesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'remove'),
            withFlagArg('--force', options.force),
            withArg(...options.imageRefs),
        )();
    }

    protected async parseRemoveImagesCommandOutput(
        options: RemoveImagesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<string>> {
        return asIds(output);
    }

    async removeImages(options: RemoveImagesCommandOptions): Promise<CommandResponse<string[]>> {
        return {
            command: this.commandName,
            args: this.getRemoveImagesCommandArgs(options),
            parse: (output, strict) => this.parseRemoveImagesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region PushImage Command

    protected getPushImageCommandArgs(options: PushImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'push'),
            withArg(options.imageRef),
        )();
    }

    async pushImage(options: PushImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getPushImageCommandArgs(options),
        };
    }

    //#endregion

    //#region PruneImages Command

    protected getPruneImagesCommandArgs(options: PruneImagesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'prune'),
            withArg('--force'),
            withFlagArg('--all', options.all),
        )();
    }

    protected parsePruneImagesCommandOutput(
        options: PruneImagesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<PruneImagesItem> {
        // TODO: Parse output for prune info
        return Promise.resolve({});
    }

    async pruneImages(options: PruneImagesCommandOptions): Promise<CommandResponse<PruneImagesItem>> {
        return {
            command: this.commandName,
            args: this.getPruneImagesCommandArgs(options),
            parse: (output, strict) => this.parsePruneImagesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region PullImage Command

    /**
     * Generate the command line arguments for invoking a pull image command on
     * a Docker-like client
     * @param options Pull image command options
     * @returns Command line arguments for pulling a container image
     */
    protected getPullImageCommandArgs(options: PullImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'pull'),
            withFlagArg('--all-tags', options.allTags),
            withNamedArg(
                '--disable-content-trust',
                typeof options.disableContentTrust === 'boolean'
                    ? options.disableContentTrust.toString()
                    : undefined),
            withArg(options.imageRef),
        )();
    }

    protected parsePullImageCommandOutput(
        options: PullImageCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    async pullImage(options: PullImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getPullImageCommandArgs(options),
            parse: (output, strict) => this.parsePullImageCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region TagImage Command

    protected getTagImageCommandArgs(options: TagImageCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('image', 'tag'),
            withArg(options.fromImageRef, options.toImageRef),
        )();
    }

    async tagImage(options: TagImageCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getTagImageCommandArgs(options),
        };
    }

    //#endregion

    //#region InspectImages Command

    /**
     * Generate the command line arguments to run an inspect images command on a
     * Docker-like client
     * @param options Standard inspect images options
     * @returns Command line args to run an inspect images command on a given Docker-like client
     */
    protected getInspectImagesCommandArgs(
        options: InspectImagesCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInspectImageRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('image', 'inspect'),
            withNamedArg(
                '--format',
                // By specifying an explicit Go template format output, we're able to use the same normalization logic
                // for both Docker and Podman clients
                goTemplateJsonFormat<DockerInspectImageRecord>(
                    options.shellProvider, {
                    Id: goTemplateJsonProperty`.ID`,
                    RepoTags: goTemplateJsonProperty`.RepoTags`,
                    EnvVars: goTemplateJsonProperty`.Config.Env`,
                    Labels: goTemplateJsonProperty`.Config.Labels`,
                    Ports: goTemplateJsonProperty`.Config.ExposedPorts`,
                    Volumes: goTemplateJsonProperty`.Config.Volumes`,
                    Entrypoint: goTemplateJsonProperty`.Config.Entrypoint`,
                    Command: goTemplateJsonProperty`.Config.Cmd`,
                    CWD: goTemplateJsonProperty`.Config.WorkingDir`,
                    RepoDigests: goTemplateJsonProperty`.RepoDigests`,
                    Architecture: goTemplateJsonProperty`.Architecture`,
                    OperatingSystem: goTemplateJsonProperty`.Os`,
                    CreatedAt: goTemplateJsonProperty`.Created`,
                    User: goTemplateJsonProperty`.Config.User`,
                    Raw: goTemplateJsonProperty`.`,
                },
                    formatOverrides,
                ),
            ),
            withArg(...options.imageRefs),
        )();
    }

    /**
     * Parse the standard output from a Docker-like inspect images command and
     * normalize the result
     * @param options Inspect images command options
     * @param output The standard out from a Docker-like runtime inspect images command
     * @param strict Should strict parsing be enforced?
     * @returns Normalized array of InspectImagesItem records
     */
    protected async parseInspectImagesCommandOutput(
        options: InspectImagesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<InspectImagesItem>> {
        try {
            return output.split('\n').reduce<Array<InspectImagesItem>>((images, inspectString) => {
                if (!inspectString) {
                    return images;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectImageRecord(inspect)) {
                        throw new Error('Invalid image inspect json');
                    }

                    // This is effectively doing firstOrDefault on the RepoTags for the image. If there are any values
                    // in RepoTags, the first one will be parsed and returned as the tag name for the image.
                    const imageNameInfo: ImageNameInfo = parseDockerLikeImageName(inspect.RepoTags?.[0]);

                    // Parse any environment variables defined for the image
                    const environmentVariables = (inspect.EnvVars || []).reduce<Record<string, string>>((evs, ev) => {
                        const index = ev.indexOf('=');
                        if (index > -1) {
                            const name = ev.slice(0, index);
                            const value = ev.slice(index + 1);

                            return {
                                ...evs,
                                [name]: value,
                            };
                        }

                        return evs;
                    }, {});

                    // Parse any default ports exposed by the image
                    const ports = Object.entries(inspect.Ports || {}).map<PortBinding>(([rawPort]) => {
                        const [port, protocol] = rawPort.split('/');
                        return {
                            containerPort: parseInt(port),
                            protocol: protocol.toLowerCase() === 'tcp' ? 'tcp' : protocol.toLowerCase() === 'udp' ? 'udp' : undefined,
                        };
                    });

                    // Parse any default volumes specified by the image
                    const volumes = Object.entries(inspect.Volumes || {}).map<string>(([rawVolume]) => rawVolume);

                    // Parse any labels assigned to the image
                    const labels = inspect.Labels ?? {};

                    // Parse and normalize the image architecture
                    const architecture = inspect.Architecture.toLowerCase() === 'amd64'
                        ? 'amd64'
                        : inspect.Architecture.toLowerCase() === 'arm64' ? 'arm64' : undefined;

                    // Parse and normalize the image OS
                    const os = inspect.OperatingSystem.toLowerCase() === 'linux'
                        ? 'linux'
                        : inspect.Architecture.toLowerCase() === 'windows'
                            ? 'windows'
                            : undefined;

                    // Determine if the image has been pushed to a remote repo
                    // (no repo digests or only localhost/ repo digests)
                    const isLocalImage = !(inspect.RepoDigests || []).some((digest) => !digest.toLowerCase().startsWith('localhost/'));

                    // Return a normalized InspectImagesItem record
                    const image: InspectImagesItem = {
                        id: inspect.Id,
                        image: imageNameInfo,
                        repoDigests: inspect.RepoDigests,
                        isLocalImage,
                        environmentVariables,
                        ports,
                        volumes,
                        labels,
                        entrypoint: inspect.Entrypoint,
                        command: inspect.Command,
                        currentDirectory: inspect.CWD || undefined,
                        architecture,
                        operatingSystem: os,
                        createdAt: dayjs.utc(inspect.CreatedAt).toDate(),
                        user: inspect.User,
                        raw: JSON.stringify(inspect.Raw),
                    };

                    return [...images, image];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return images;
            }, new Array<InspectImagesItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        // If there were no image records or there was a parsing error but
        // strict parsing was disabled, return an empty array
        return new Array<InspectImagesItem>();
    }

    async inspectImages(options: InspectImagesCommandOptions): Promise<CommandResponse<Array<InspectImagesItem>>> {
        return {
            command: this.commandName,
            args: this.getInspectImagesCommandArgs(options),
            parse: (output, strict) => this.parseInspectImagesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#endregion

    //#region Container Commands

    //#region RunContainer Command

    /**
     * Generate the command line arguments for a Docker-like run container
     * command
     * @param options Standard run container options
     * @returns Command line arguments for a Docker-like run container command
     */
    protected getRunContainerCommandArgs(options: RunContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'run'),
            withFlagArg('--detach', options.detached),
            withFlagArg('--interactive', options.interactive),
            withFlagArg('--tty', options.detached || options.interactive),
            withFlagArg('--rm', options.removeOnExit),
            withNamedArg('--name', options.name),
            withDockerPortsArg(options.ports),
            withFlagArg('--publish-all', options.publishAllPorts),
            withNamedArg('--network', options.network),
            withNamedArg('--network-alias', options.networkAlias),
            withDockerAddHostArg(options.addHost),
            withDockerMountsArg(options.mounts),
            withDockerLabelsArg(options.labels),
            withDockerEnvArg(options.environmentVariables),
            withNamedArg('--env-file', options.environmentFiles),
            withNamedArg('--entrypoint', options.entrypoint),
            withArg(options.customOptions),
            withArg(options.imageRef),
            withArg(...(toArray(options.command || []))),
        )();
    }

    /**
     * Parse standard output for a run container command
     * @param options The standard run container command options
     * @param output Standard output for a run container command
     * @param strict Should strict parsing be enforced
     * @returns The container ID if running detached or standard out if running attached
     */
    protected async parseRunContainerCommandOutput(
        options: RunContainerCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<string | undefined> {
        return options.detached ? output.split('\n', 1)[0] : output;
    }

    /**
     * Generate a CommandResponse for a Docker-like run container command that includes how to run and parse command output
     * @param options Standard run container command options
     * @returns A CommandResponse object for a Docker-like run container command
     */
    async runContainer(options: RunContainerCommandOptions): Promise<CommandResponse<string | undefined>> {
        return {
            command: this.commandName,
            args: this.getRunContainerCommandArgs(options),
            parse: (output, strict) => this.parseRunContainerCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region ExecContainer Command

    protected getExecContainerCommandArgs(options: ExecContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'exec'),
            withFlagArg('--interactive', options.interactive),
            withFlagArg('--detached', options.detached),
            withFlagArg('--tty', options.tty),
            withDockerEnvArg(options.environmentVariables),
            withArg(options.container),
            withArg(...toArray(options.command)),
        )();
    }

    protected parseExecContainerCommandOutput(
        options: ExecContainerCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<string> {
        return Promise.resolve(output);
    }

    async execContainer(options: ExecContainerCommandOptions): Promise<CommandResponse<string>> {
        return {
            command: this.commandName,
            args: this.getExecContainerCommandArgs(options),
            parse: (output, strict) => this.parseExecContainerCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region ListContainers Command

    protected getListContainersCommandArgsCore(
        options: ListContainersCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerListContainerRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('container', 'ls'),
            withFlagArg('--all', options.all),
            withDockerLabelFilterArgs(options.labels),
            withNamedArg('--filter', options.running ? 'status=running' : undefined),
            withNamedArg('--filter', options.exited ? 'status=exited' : undefined),
            withNamedArg('--filter', options.names?.map((name) => `name=${name}`)),
            withNamedArg('--filter', options.imageAncestors?.map((id) => `ancestor=${id}`)),
            withNamedArg('--filter', options.volumes?.map((volume) => `volume=${volume}`)),
            withNamedArg('--filter', options.networks?.map((network) => `network=${network}`)),
            withDockerNoTruncArg,
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerListContainerRecord>(
                    options.shellProvider, {
                    Id: goTemplateJsonProperty`.ID`,
                    Names: goTemplateJsonProperty`.Names`,
                    Image: goTemplateJsonProperty`.Image`,
                    Ports: goTemplateJsonProperty`.Ports`,
                    Networks: goTemplateJsonProperty`.Networks`,
                    Labels: goTemplateJsonProperty`.Labels`,
                    CreatedAt: goTemplateJsonProperty`.CreatedAt`,
                    State: goTemplateJsonProperty`.State`,
                    Status: goTemplateJsonProperty`.Status`,
                },
                    formatOverrides,
                ),
            ),
        )();
    }

    protected getListContainersCommandArgs(options: ListContainersCommandOptions) {
        return this.getListContainersCommandArgsCore(options);
    }

    protected async parseListContainersCommandOutput(
        options: ListContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<ListContainersItem>> {
        const containers = new Array<ListContainersItem>();
        try {
            output.split('\n').forEach((containerJson) => {
                try {
                    if (!containerJson) {
                        return;
                    }

                    const rawContainer = JSON.parse(containerJson);

                    if (!isDockerListContainerRecord(rawContainer)) {
                        throw new Error('Invalid container JSON');
                    }

                    const labels = parseDockerLikeLabels(rawContainer.Labels);

                    const ports = rawContainer.Ports
                        .split(',')
                        .map((port) => port.trim())
                        .filter((port) => !!port)
                        .reduce<Array<PortBinding>>((portBindings, rawPort) => {
                            const parsedPort = parseDockerRawPortString(rawPort);
                            if (parsedPort) {
                                return portBindings.concat(parsedPort);
                            } else if (strict) {
                                throw new Error('Invalid container JSON');
                            } else {
                                return portBindings;
                            }
                        }, []);

                    const networks = rawContainer.Networks
                        .split(',');

                    const name = rawContainer.Names.split(',')[0].trim();
                    const createdAt = dayjs.utc(rawContainer.CreatedAt, this.listDateFormat).toDate();

                    containers.push({
                        id: rawContainer.Id,
                        name,
                        labels,
                        image: parseDockerLikeImageName(rawContainer.Image),
                        ports,
                        networks,
                        createdAt,
                        state: rawContainer.State,
                        status: rawContainer.Status,
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

        return containers;
    }

    async listContainers(options: ListContainersCommandOptions): Promise<CommandResponse<Array<ListContainersItem>>> {
        return {
            command: this.commandName,
            args: this.getListContainersCommandArgs(options),
            parse: (output, strict) => this.parseListContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region StartContainers Command

    protected getStartContainersCommandArgs(options: StartContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'start'),
            withArg(...toArray(options.container)),
        )();
    }

    protected async parseStartContainersCommandOutput(
        options: StartContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<string>> {
        return asIds(output);
    }

    async startContainers(options: StartContainersCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getStartContainersCommandArgs(options),
            parse: (output, strict) => this.parseStartContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region RestartContainers Command

    protected getRestartContainersCommandArgs(options: RestartContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'restart'),
            withArg(...toArray(options.container)),
        )();
    }

    protected async parseRestartContainersCommandOutput(
        options: RestartContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<string>> {
        return asIds(output);
    }

    async restartContainers(options: RestartContainersCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getRestartContainersCommandArgs(options),
            parse: (output, strict) => this.parseRestartContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region StopContainers Command

    /**
     * Generate command line arguments for running a stop container command
     * @param options Standard stop container command options
     * @returns The command line arguments required to run the stop container command on a Docker-like runtime
     */
    protected getStopContainersCommandArgs(options: StopContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'stop'),
            withNamedArg('--time', typeof options.time === 'number' ? options.time.toString() : undefined),
            withArg(...toArray(options.container)),
        )();
    }

    /**
     * Parse the standard output from running a stop container command on a Docker-like runtime
     * @param options Stop container command options
     * @param output The standard out from the stop containers command
     * @param strict Should strict parsing be enforced
     * @returns A list of IDs for containers that were stopped
     */
    protected async parseStopContainersCommandOutput(
        options: StopContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<string>> {
        return asIds(output);
    }

    async stopContainers(options: StopContainersCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getStopContainersCommandArgs(options),
            parse: (output, strict) => this.parseStopContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region RemoveContainers Command

    protected getRemoveContainersCommandArgs(options: RemoveContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'rm'),
            withFlagArg('--force', options.force),
            withArg(...options.containers),
        )();
    }

    protected async parseRemoveContainersCommandOutput(
        options: RemoveContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<string>> {
        return asIds(output);
    }

    async removeContainers(options: RemoveContainersCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getRemoveContainersCommandArgs(options),
            parse: (output, strict) => this.parseRemoveContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region PruneContainers Command

    protected getPruneContainersCommandArgs(options: PruneContainersCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'prune'),
            withArg('--force'),
        )();
    }

    protected async parsePruneContainersCommandOutput(
        options: PruneContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<PruneContainersItem> {
        // TODO: Parse output for prune info
        return {};
    }

    async pruneContainers(options: PruneContainersCommandOptions): Promise<CommandResponse<PruneContainersItem>> {
        return {
            command: this.commandName,
            args: this.getPruneContainersCommandArgs(options),
            parse: (output, strict) => this.parsePruneContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region StatsContainers Command

    protected getStatsContainersCommandArgs(options: ContainersStatsCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'stats'),
            withFlagArg('--all', options.all),
        )();
    }

    protected async parseStatsContainersCommandArgs(
        options: ContainersStatsCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<string> {
        return output;
    }

    async statsContainers(options: ContainersStatsCommandOptions): Promise<CommandResponse<string>> {
        throw new CommandNotSupportedError('statsContainers is not supported for this runtime');
    }

    //#endregion

    //#region LogsForContainer Command

    /**
     * Generate the command line arguments for the log container command on a
     * Docker-like client
     * @param options Options for log container command
     * @returns Command line arguments to invoke a log container command on a Docker-like client
     */
    protected getLogsForContainerCommandArgs(options: LogsForContainerCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('container', 'logs'),
            withFlagArg('--follow', options.follow),
            withFlagArg('--timestamps', options.timestamps),
            withNamedArg('--tail', options.tail?.toString()),
            withNamedArg('--since', options.since),
            withNamedArg('--until', options.until),
            withArg(options.container),
        )();
    }

    /**
     * Parse the standard out from running a log container command on a
     * Docker-like client
     * @param options Options for the log container command
     * @param output The standard output from running the command
     * @param strict Should strict parsing be used?
     * @returns An empty promise
     */
    protected parseLogsForContainerCommandOutput(
        options: LogsForContainerCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    /**
     * Generate a CommandResponse object for a Docker-like log container command
     * @param options Options for the log container command
     * @returns The CommandResponse object for the log container command
     */
    async logsForContainer(options: LogsForContainerCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getLogsForContainerCommandArgs(options),
            parse: (output, strict) => this.parseLogsForContainerCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region InspectContainers Command

    /**
     * Only override this method if you need to make substantial changes to the inspect container commands required for
     * a given runtime
     * @param options Inspect containers command options
     * @param formatOverrides Optional overrides for the Go template JSON mapping
     * @returns Command line args for invoking inspect containers on a Docker-like client
     */
    protected getInspectContainersCommandArgsCore(
        options: InspectContainersCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInspectContainerRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('container', 'inspect'),
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerInspectContainerRecord>(
                    options.shellProvider, {
                    Id: goTemplateJsonProperty`.ID`,
                    Name: goTemplateJsonProperty`.Name`,
                    ImageId: goTemplateJsonProperty`.Image`,
                    ImageName: goTemplateJsonProperty`.Config.Image`,
                    Status: goTemplateJsonProperty`.State.Status`,
                    Platform: goTemplateJsonProperty`.Platform`,
                    EnvVars: goTemplateJsonProperty`.Config.Env`,
                    Networks: goTemplateJsonProperty`.NetworkSettings.Networks`,
                    IP: goTemplateJsonProperty`.NetworkSettings.IPAddress`,
                    Ports: goTemplateJsonProperty`.NetworkSettings.Ports`,
                    PublishAllPorts: goTemplateJsonProperty`.HostConfig.PublishAllPorts`,
                    Mounts: goTemplateJsonProperty`.Mounts`,
                    Labels: goTemplateJsonProperty`.Config.Labels`,
                    Entrypoint: goTemplateJsonProperty`.Config.Entrypoint`,
                    Command: goTemplateJsonProperty`.Config.Cmd`,
                    CWD: goTemplateJsonProperty`.Config.WorkingDir`,
                    CreatedAt: goTemplateJsonProperty`.Created`,
                    StartedAt: goTemplateJsonProperty`.State.StartedAt`,
                    FinishedAt: goTemplateJsonProperty`.State.FinishedAt`,
                    Raw: goTemplateJsonProperty`.`,
                },
                    formatOverrides,
                ),
            ),
            withArg(...options.containers)
        )();
    }

    /**
     * Override this method if the default Go Template JSON mappings need to be changed for a given runtime
     * @param options Inspect containers command options
     * @returns Command line args for invoking inspect containers on a Docker-like client
     */
    protected getInspectContainersCommandArgs(options: InspectContainersCommandOptions): CommandLineArgs {
        return this.getInspectContainersCommandArgsCore(options);
    }

    /**
     * Parse the output from running an inspect containers command on a Docker-like client
     * @param options Inspect containers command options
     * @param output Standard out from running a Docker-like inspect containers command
     * @param strict Should strict parsing be used to parse the output?
     * @returns An array of InspectContainersItem records
     */
    protected async parseInspectContainersCommandOutput(
        options: InspectContainersCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<InspectContainersItem>> {
        try {
            return output.split('\n').reduce<Array<InspectContainersItem>>((containers, inspectString) => {
                if (!inspectString) {
                    return containers;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectContainerRecord(inspect)) {
                        throw new Error('Invalid container inspect json');
                    }

                    // Parse the environment variables assigned to the container at runtime
                    const environmentVariables = (inspect.EnvVars || []).reduce<Record<string, string>>((evs, ev) => {
                        const index = ev.indexOf('=');
                        if (index > -1) {
                            const name = ev.slice(0, index);
                            const value = ev.slice(index + 1);

                            return {
                                ...evs,
                                [name]: value,
                            };
                        }

                        return evs;
                    }, {});

                    // Parse the networks assigned to the container and normalize to InspectContainersItemNetwork
                    // records
                    const networks = Object.entries(inspect.Networks || {}).map<InspectContainersItemNetwork>(([name, dockerNetwork]) => {
                        return {
                            name,
                            gateway: dockerNetwork.Gateway || undefined,
                            ipAddress: dockerNetwork.IPAddress || undefined,
                            macAddress: dockerNetwork.MacAddress || undefined,
                        };
                    });

                    // Parse the exposed ports for the container and normalize to a PortBinding record
                    const ports = Object.entries(inspect.Ports || {}).map<PortBinding>(([rawPort, hostBinding]) => {
                        const [port, protocol] = rawPort.split('/');
                        return {
                            hostIp: hostBinding?.[0]?.HostIp,
                            hostPort: hostBinding?.[0]?.HostPort,
                            containerPort: parseInt(port),
                            protocol: protocol.toLowerCase() === 'tcp'
                                ? 'tcp'
                                : protocol.toLowerCase() === 'udp'
                                    ? 'udp'
                                    : undefined,
                        };
                    });

                    // Parse the volume and bind mounts associated with the given runtime and normalize to
                    // InspectContainersItemMount records
                    const mounts = (inspect.Mounts || []).reduce<Array<InspectContainersItemMount>>((curMounts, mount) => {
                        switch (mount?.Type) {
                            case 'bind':
                                return [...curMounts, {
                                    type: 'bind',
                                    source: mount.Source,
                                    destination: mount.Destination,
                                    readOnly: !mount.RW,
                                }];
                            case 'volume':
                                return [...curMounts, {
                                    type: 'volume',
                                    name: mount.Name,
                                    source: mount.Source,
                                    destination: mount.Destination,
                                    driver: mount.Driver,
                                    readOnly: !mount.RW,
                                }];
                        }

                    }, new Array<InspectContainersItemMount>());
                    const labels = inspect.Labels ?? {};

                    const createdAt = dayjs.utc(inspect.CreatedAt);
                    const startedAt = inspect.StartedAt
                        ? dayjs.utc(inspect.StartedAt)
                        : undefined;
                    const finishedAt = inspect.FinishedAt
                        ? dayjs.utc(inspect.FinishedAt)
                        : undefined;

                    // Return the normalized InspectContainersItem record
                    const container: InspectContainersItem = {
                        id: inspect.Id,
                        name: inspect.Name,
                        imageId: inspect.ImageId,
                        image: parseDockerLikeImageName(inspect.ImageName),
                        status: inspect.Status,
                        environmentVariables,
                        networks,
                        ipAddress: inspect.IP ? inspect.IP : undefined,
                        ports,
                        mounts,
                        labels,
                        entrypoint: toArray(inspect.Entrypoint ?? []),
                        command: toArray(inspect.Command ?? []),
                        currentDirectory: inspect.CWD || undefined,
                        createdAt: createdAt.toDate(),
                        startedAt: startedAt && (startedAt.isSame(createdAt) || startedAt.isAfter(createdAt))
                            ? startedAt.toDate()
                            : undefined,
                        finishedAt: finishedAt && (finishedAt.isSame(createdAt) || finishedAt.isAfter(createdAt))
                            ? finishedAt.toDate()
                            : undefined,
                        raw: JSON.stringify(inspect.Raw),
                    };

                    return [...containers, container];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return containers;
            }, new Array<InspectContainersItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return new Array<InspectContainersItem>();
    }

    async inspectContainers(
        options: InspectContainersCommandOptions,
    ): Promise<CommandResponse<InspectContainersItem[]>> {
        return {
            command: this.commandName,
            args: this.getInspectContainersCommandArgs(options),
            parse: (output, strict) => this.parseInspectContainersCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#endregion

    //#region Volume Commands

    //#region CreateVolume Command

    protected getCreateVolumeCommandArgs(options: CreateVolumeCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'create'),
            withNamedArg('--driver', options.driver),
            withArg(options.name),
            withDockerJsonFormatArg,
        )();
    }

    protected parseCreateVolumeCommandOutput(
        options: CreateVolumeCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<void> {
        return Promise.resolve();
    }

    async createVolume(options: CreateVolumeCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getCreateVolumeCommandArgs(options),
            parse: (output, strict) => this.parseCreateVolumeCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region ListVolumes Command

    protected getListVolumesCommandArgs(options: ListVolumesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'ls'),
            withNamedArg(
                '--filter',
                typeof options.dangling === 'boolean'
                    ? `dangling=${options.dangling}`
                    : undefined),
            withNamedArg(
                '--filter',
                options.driver
                    ? `driver=${options.driver}`
                    : undefined),
            withDockerLabelFilterArgs(options.labels),
            withDockerJsonFormatArg,
        )();
    }

    protected async parseListVolumesCommandOputput(
        options: ListVolumesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<ListVolumeItem[]> {
        const volumes = new Array<ListVolumeItem>();
        try {
            output.split("\n").forEach((volumeJson) => {
                try {
                    if (!volumeJson) {
                        return;
                    }

                    const rawVolume = JSON.parse(volumeJson);

                    if (!isDockerVolumeRecord(rawVolume)) {
                        throw new Error('Invalid volume JSON');
                    }

                    // Parse the labels assigned to the volumes and normalize to key value pairs
                    const labels = parseDockerLikeLabels(rawVolume.Labels);

                    const createdAt = rawVolume.CreatedAt
                        ? dayjs.utc(rawVolume.CreatedAt)
                        : undefined;

                    const size = tryParseSize(rawVolume.Size);

                    volumes.push({
                        name: rawVolume.Name,
                        driver: rawVolume.Driver,
                        labels,
                        mountpoint: rawVolume.Mountpoint,
                        scope: rawVolume.Scope,
                        createdAt: createdAt?.toDate(),
                        size
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

        return volumes;
    }

    async listVolumes(options: ListVolumesCommandOptions): Promise<CommandResponse<ListVolumeItem[]>> {
        return {
            command: this.commandName,
            args: this.getListVolumesCommandArgs(options),
            parse: (output, strict) => this.parseListVolumesCommandOputput(options, output, strict),
        };
    }

    //#endregion

    //#region RemoveVolumes Command

    /**
     * Generate the command line arguments for a Docker-like remove volumes
     * command
     * @param options Remove volumes command options
     * @returns Command line arguments for invoking a remove volumes command
     */
    protected getRemoveVolumesCommandArgs(options: RemoveVolumesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'rm'),
            withFlagArg('--force', options.force),
            withArg(...options.volumes),
        )();
    }

    /**
     * Parse the output from running a Docker-like remove volumes command
     * @param options Options for the remove volumes command
     * @param output Standard out from running the remove volumes command
     * @param strict Should strict parsing be enforced?
     * @returns A list of IDs for the volumes removed
     */
    protected async parseRemoveVolumesCommandOutput(
        options: RemoveVolumesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<string[]> {
        return asIds(output);
    }

    /**
     * Generate a CommandResponse instance for a Docker-like remove volumes
     * command
     * @param options Options for remove volumes command
     * @returns CommandResponse for the remove volumes command
     */
    async removeVolumes(options: RemoveVolumesCommandOptions): Promise<CommandResponse<string[]>> {
        return {
            command: this.commandName,
            args: this.getRemoveVolumesCommandArgs(options),
            parse: (output, strict) => this.parseRemoveVolumesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region PruneVolumes Command

    protected getPruneVolumesCommandArgs(options: PruneVolumesCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'prune'),
            withArg('--force'),
        )();
    }

    protected async parsePruneVolumesCommandOutput(
        options: PruneVolumesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<PruneVolumesItem> {
        // TODO: Parse output for prune info
        return {};
    }

    async pruneVolumes(options: PruneVolumesCommandOptions): Promise<CommandResponse<PruneVolumesItem>> {
        return {
            command: this.commandName,
            args: this.getPruneVolumesCommandArgs(options),
            parse: (output, strict) => this.parsePruneVolumesCommandOutput(options, output, strict),

        };
    }

    //#endregion

    //#region InspectVolumes Command

    protected getInspectVolumesCommandArgsCore(
        options: InspectVolumesCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInspectVolumeRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('volume', 'inspect'),
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerInspectVolumeRecord>(
                    options.shellProvider,
                    {
                        Name: goTemplateJsonProperty`.Name`,
                        Driver: goTemplateJsonProperty`.Driver`,
                        Mountpoint: goTemplateJsonProperty`.Mountpoint`,
                        Scope: goTemplateJsonProperty`.Scope`,
                        Labels: goTemplateJsonProperty`.Labels`,
                        Options: goTemplateJsonProperty`.Options`,
                        CreatedAt: goTemplateJsonProperty`.CreatedAt`,
                        Raw: goTemplateJsonProperty`.`,
                    },
                    formatOverrides,
                ),
            ),
            withArg(...options.volumes),
        )();
    }

    protected getInspectVolumesCommandArgs(options: InspectVolumesCommandOptions): CommandLineArgs {
        return this.getInspectVolumesCommandArgsCore(options);
    }

    protected async parseInspectVolumesCommandOutput(
        options: InspectVolumesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<InspectVolumesItem>> {
        try {
            return output.split('\n').reduce<Array<InspectVolumesItem>>((volumes, inspectString) => {
                if (!inspectString) {
                    return volumes;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectVolumeRecord(inspect)) {
                        throw new Error('Invalid volume inspect json');
                    }

                    const createdAt = dayjs.utc(inspect.CreatedAt);

                    // Return the normalized InspectVolumesItem record
                    const volume: InspectVolumesItem = {
                        name: inspect.Name,
                        driver: inspect.Driver,
                        mountpoint: inspect.Mountpoint,
                        scope: inspect.Scope,
                        labels: inspect.Labels,
                        options: inspect.Options,
                        createdAt: createdAt.toDate(),
                        raw: JSON.stringify(inspect.Raw),
                    };

                    return [...volumes, volume];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return volumes;
            }, new Array<InspectVolumesItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return new Array<InspectVolumesItem>();
    }

    async inspectVolumes(options: InspectVolumesCommandOptions): Promise<CommandResponse<Array<InspectVolumesItem>>> {
        return {
            command: this.commandName,
            args: this.getInspectVolumesCommandArgs(options),
            parse: (output, strict) => this.parseInspectVolumesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#endregion

    //#region Network Commands

    //#region CreateNetwork Command

    protected getCreateNetworkCommandArgs(options: CreateNetworkCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('network', 'create'),
            withNamedArg('--driver', options.driver),
            withArg(options.name),
        )();
    }

    async createNetwork(options: CreateNetworkCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getCreateNetworkCommandArgs(options),
        };
    }

    //#endregion

    //#region ListNetworks Command

    protected getListNetworksCommandArgsCore(
        options: ListNetworksCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerNetworkRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withNamedArg('network', 'ls'),
            withDockerLabelFilterArgs(options.labels),
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerNetworkRecord>(
                    options.shellProvider, {
                    Id: goTemplateJsonProperty`.ID`,
                    Name: goTemplateJsonProperty`.Name`,
                    Driver: goTemplateJsonProperty`.Driver`,
                    Scope: goTemplateJsonProperty`.Scope`,
                    Labels: goTemplateJsonProperty`.Labels`,
                    IPv6: goTemplateJsonProperty`.IPv6`,
                    Internal: goTemplateJsonProperty`.Internal`,
                    CreatedAt: goTemplateJsonProperty`.CreatedAt`,
                },
                    formatOverrides,
                ),
            ),
        )();
    }

    protected getListNetworksCommandArgs(options: ListNetworksCommandOptions): CommandLineArgs {
        return this.getListNetworksCommandArgsCore(options);
    }

    protected async parseListNetworksCommandOutput(
        options: ListNetworksCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<ListNetworkItem>> {
        const networks = new Array<ListNetworkItem>();
        try {
            output.split("\n").forEach((networkJson) => {
                try {
                    if (!networkJson) {
                        return;
                    }

                    const rawNetwork = JSON.parse(networkJson);

                    if (!isDockerNetworkRecord(rawNetwork)) {
                        throw new Error('Invalid volume JSON');
                    }

                    // Parse the labels assigned to the networks and normalize to key value pairs
                    const labels = parseDockerLikeLabels(rawNetwork.Labels);

                    const createdAt = dayjs.utc(rawNetwork.CreatedAt).toDate();

                    networks.push({
                        id: rawNetwork.Id,
                        name: rawNetwork.Name,
                        driver: rawNetwork.Driver,
                        labels,
                        scope: rawNetwork.Scope,
                        ipv6: rawNetwork.IPv6.toLowerCase() === 'true',
                        internal: rawNetwork.Internal.toLowerCase() === 'true',
                        createdAt,
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

        return networks;
    }

    async listNetworks(options: ListNetworksCommandOptions): Promise<CommandResponse<Array<ListNetworkItem>>> {
        return {
            command: this.commandName,
            args: this.getListNetworksCommandArgs(options),
            parse: (output, strict) => this.parseListNetworksCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region RemoveNetworks Command

    protected getRemoveNetworksCommandArgs(options: RemoveNetworksCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('network', 'remove'),
            withFlagArg('--force', options.force),
            withArg(...options.networks),
        )();
    }

    protected async parseRemoveNetworksCommandOutput(
        options: RemoveNetworksCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<string>> {
        return output.split('\n').map((id) => id);
    }

    async removeNetworks(options: RemoveNetworksCommandOptions): Promise<CommandResponse<Array<string>>> {
        return {
            command: this.commandName,
            args: this.getRemoveNetworksCommandArgs(options),
            parse: (output, strict) => this.parseRemoveNetworksCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region PruneNetworks Command

    protected getPruneNetworksCommandArgs(options: PruneNetworksCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('network', 'prune'),
            withArg('--force'),
        )();
    }

    protected async parsePruneNetworksCommandOutput(
        options: PruneNetworksCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<PruneNetworksItem> {
        // TODO: Parse output for prune info
        return {};
    }

    async pruneNetworks(options: PruneNetworksCommandOptions): Promise<CommandResponse<PruneNetworksItem>> {
        return {
            command: this.commandName,
            args: this.getPruneNetworksCommandArgs(options),
            parse: (output, strict) => this.parsePruneNetworksCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region InspectNetworks Command

    protected getInspectNetworksCommandArgsCore(
        options: InspectNetworksCommandOptions,
        formatOverrides?: Partial<GoTemplateJsonFormatOptions<DockerInspectNetworkRecord>>,
    ): CommandLineArgs {
        return composeArgs(
            withArg('network', 'inspect'),
            withNamedArg(
                '--format',
                goTemplateJsonFormat<DockerInspectNetworkRecord>(
                    options.shellProvider, {
                    Id: goTemplateJsonProperty`.Id`,
                    Name: goTemplateJsonProperty`.Name`,
                    Driver: goTemplateJsonProperty`.Driver`,
                    Scope: goTemplateJsonProperty`.Scope`,
                    Labels: goTemplateJsonProperty`.Labels`,
                    Ipam: goTemplateJsonProperty`.IPAM`,
                    EnableIPv6: goTemplateJsonProperty`.EnableIPv6`,
                    Internal: goTemplateJsonProperty`.Internal`,
                    Attachable: goTemplateJsonProperty`.Attachable`,
                    Ingress: goTemplateJsonProperty`.Ingress`,
                    CreatedAt: goTemplateJsonProperty`.Created`,
                    Raw: goTemplateJsonProperty`.`,
                },
                    formatOverrides,
                ),
            ),
            withArg(...options.networks),
        )();
    }

    protected getInspectNetworksCommandArgs(options: InspectNetworksCommandOptions): CommandLineArgs {
        return this.getInspectNetworksCommandArgsCore(options);
    }

    protected async parseInspectNetworksCommandOutput(
        options: InspectNetworksCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<Array<InspectNetworksItem>> {
        try {
            return output.split('\n').reduce<Array<InspectNetworksItem>>((networks, inspectString) => {
                if (!inspectString) {
                    return networks;
                }

                try {
                    const inspect = JSON.parse(inspectString);

                    if (!isDockerInspectNetworkRecord(inspect)) {
                        throw new Error('Invalid network inspect json');
                    }

                    const ipam: NetworkIpamConfig = {
                        driver: inspect.Ipam.Driver,
                        config: inspect.Ipam.Config.map(({ Subnet, Gateway }) => ({
                            subnet: Subnet,
                            gateway: Gateway,
                        })),
                    };

                    const createdAt = dayjs.utc(inspect.CreatedAt);

                    // Return the normalized InspectNetworksItem record
                    const network: InspectNetworksItem = {
                        id: inspect.Id,
                        name: inspect.Name,
                        driver: inspect.Driver,
                        scope: inspect.Scope,
                        labels: inspect.Labels,
                        ipam,
                        ipv6: inspect.EnableIPv6,
                        internal: inspect.Internal,
                        attachable: inspect.Attachable,
                        ingress: inspect.Ingress,
                        createdAt: createdAt.toDate(),
                        raw: JSON.stringify(inspect.Raw),
                    };

                    return [...networks, network];
                } catch (err) {
                    if (strict) {
                        throw err;
                    }
                }

                return networks;
            }, new Array<InspectNetworksItem>());
        } catch (err) {
            if (strict) {
                throw err;
            }
        }

        return new Array<InspectNetworksItem>();
    }

    async inspectNetworks(options: InspectNetworksCommandOptions): Promise<CommandResponse<InspectNetworksItem[]>> {
        return {
            command: this.commandName,
            args: this.getInspectNetworksCommandArgs(options),
            parse: (output, strict) => this.parseInspectNetworksCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#endregion

    //#region Context Commands

    //#region ListContexts Command

    async listContexts(options: ListContextsCommandOptions): Promise<CommandResponse<ListContextItem[]>> {
        throw new CommandNotSupportedError('listContexts is not supported for this runtime');
    }

    //#endregion

    //#region RemoveContexts Command

    async removeContexts(options: RemoveContextsCommandOptions): Promise<CommandResponse<string[]>> {
        throw new CommandNotSupportedError('removeContexts is not supported for this runtime');
    }

    //#endregion

    //#region UseContext Command

    async useContext(options: UseContextCommandOptions): Promise<CommandResponse<void>> {
        throw new CommandNotSupportedError('useContext is not supported for this runtime');
    }

    //#endregion

    //#region InspectContexts Command

    async inspectContexts(options: InspectContextsCommandOptions): Promise<CommandResponse<InspectContextsItem[]>> {
        throw new CommandNotSupportedError('inspectContexts is not supported for this runtime');
    }

    //#endregion

    //#endregion

    //#region File Commands

    //#region ListFiles Command

    protected getListFilesCommandArgs(options: ListFilesCommandOptions): CommandLineArgs {
        let command: (string | ShellQuotedString)[];
        if (options.operatingSystem === 'windows') {
            command = [
                'cmd',
                '/C',
                // Path is intentionally *not* quoted--no good quoting options work, but
                // `cd` doesn't seem to care, so cd to the path and then do dir
                { value: `cd ${options.path} & dir /A-S /-C`, quoting: ShellQuoting.Strong }
            ];
        } else {
            command = [
                '/bin/sh',
                '-c',
                { value: `ls -lA "${options.path}"`, quoting: ShellQuoting.Strong }
            ];
        }

        return this.getExecContainerCommandArgs(
            {
                container: options.container,
                interactive: true,
                command,
            }
        );
    }

    protected async parseListFilesCommandOutput(
        options: ListFilesCommandOptions,
        output: string,
        strict: boolean,
    ): Promise<ListFilesItem[]> {
        if (options.operatingSystem === 'windows') {
            return parseListFilesCommandWindowsOutput(options, output);
        } else {
            return parseListFilesCommandLinuxOutput(options, output);
        }
    }

    async listFiles(options: ListFilesCommandOptions): Promise<CommandResponse<ListFilesItem[]>> {
        return {
            command: this.commandName,
            args: this.getListFilesCommandArgs(options),
            parse: (output, strict) => this.parseListFilesCommandOutput(options, output, strict),
        };
    }

    //#endregion

    //#region ReadFile Command

    protected getReadFileCommandArgs(options: ReadFileCommandOptions): CommandLineArgs {
        if (options.operatingSystem === 'windows') {
            // Split up the path so we can CD to the directory--to avoid the space / quoting issue
            // Note, this still doesn't work if the filename itself contains a space
            const folder = path.win32.dirname(options.path);
            const file = path.win32.basename(options.path);
            const command = [
                'cmd',
                '/C',
                { value: `cd ${folder} & type ${file}`, quoting: ShellQuoting.Strong }
            ];

            return this.getExecContainerCommandArgs(
                {
                    container: options.container,
                    interactive: true,
                    command,
                }
            );
        } else {
            return composeArgs(
                withArg('cp'),
                withContainerPathArg(options),
                withArg(options.outputFile || '-'),
            )();
        }
    }

    async readFile(options: ReadFileCommandOptions): Promise<CommandResponse<void>> {
        return {
            command: this.commandName,
            args: this.getReadFileCommandArgs(options),
        };
    }

    //#endregion

    //#region WriteFile Command

    protected getWriteFileCommandArgs(options: WriteFileCommandOptions): CommandLineArgs {
        return composeArgs(
            withArg('cp'),
            withArg(options.inputFile || '-'),
            withContainerPathArg(options),
        )();
    }

    async writeFile(options: WriteFileCommandOptions): Promise<CommandResponse<void>> {
        if (options.operatingSystem === 'windows') {
            throw new CommandNotSupportedError('Writing files is not supported on Windows containers.');
        }

        return {
            command: this.commandName,
            args: this.getWriteFileCommandArgs(options),
        };
    }

    //#endregion

    //#endregion
}
