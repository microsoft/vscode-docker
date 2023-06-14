/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import type { FileType, ShellQuotedString } from 'vscode';
import { GeneratorCommandResponse, PromiseCommandResponse, VoidCommandResponse } from './CommandRunner';
import { IShell } from './Shell';

export type ContainerOS = "linux" | "windows";

export function isContainerOS(maybeContainerOS: unknown): maybeContainerOS is ContainerOS {
    switch (maybeContainerOS) {
        case 'linux':
            return true;
        case 'windows':
            return true;
        default:
            return false;
    }
}

/**
 * Information about an image's name
 */
export interface ImageNameInfo {
    /**
     * The original name as returned by the CLI
     */
    readonly originalName?: string;
    /**
     * The name of the image. For example, in "docker.io/library/alpine:latest", this will
     * be "library/alpine".
     */
    readonly image?: string;
    /**
     * The name of the registry. If absent from the original name, this will be undefined.
     */
    readonly registry?: string;
    /**
     * The tag/anchor name. If absent, this will be undefined.
     */
    readonly tag?: string;
    /**
     * The digest. If absent, this will be undefined.
     */
    readonly digest?: string;
}

export type Labels = {
    [key: string]: string;
};

export type LabelFilters = {
    [key: string]: string | boolean;
};

// Client Identity Types

// Uniquely identifies a container client
export type ClientIdentity = {
    /**
     * The client ID. Must be unique.
     */
    readonly id: string;
    /**
     * A human-readable display name for the client. Will have a default value,
     * but can be changed by the consumer (e.g. for localization).
     */
    displayName: string;
    /**
     * A human-readable description for the client. Will have a default value,
     * but can be changed by the consumer (e.g. for localization).
     */
    description: string;
    /**
     * The default command name / path to use for the client. Will have a
     * default value, but can be changed by the consumer (e.g. for
     * custom install paths).
     */
    commandName: string;
};

export type ImageNameDefaults = {
    /**
     * The default registry used by the client for pulling public images
     */
    readonly defaultRegistry: string;
    /**
     * The default tag used by the client for pulling public images
     */
    readonly defaultTag: string;
};

export type CommonCommandOptions = {
    shellProvider?: IShell;
};

// Version Command Types

export type VersionCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export type VersionItem = {
    client: string;
    server?: string;
};

type VersionCommand = {
    /**
     * Generate a CommandResponse to retrieve runtime version information.
     * @param options Command options
     */
    version(options: VersionCommandOptions): Promise<PromiseCommandResponse<VersionItem>>;
};

// CheckInstall Command Types

export type CheckInstallCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

type CheckInstallCommand = {
    /**
     * Generate a CommandResponse to check if the runtime is installed. The
     * command will return a non-zero exit code if the runtime is not installed.
     * @param options Command options
     */
    checkInstall(options: CheckInstallCommandOptions): Promise<PromiseCommandResponse<string>>;
};

// Info Command Types

export type InfoCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export type InfoItem = {
    /**
     * The operating system for the container runtime (e.g. Docker Desktop)
     */
    operatingSystem?: string;
    /**
     * The OS type for the container runtime
     */
    osType?: ContainerOS;
    /**
     * The raw JSON from the info record
     */
    raw: string;
};

type InfoCommand = {
    /**
     * Generate a CommandResponse to retrieve runtime information
     * @param options Command options
     */
    info(options: InfoCommandOptions): Promise<PromiseCommandResponse<InfoItem>>;
};

// Event Stream Command Types

/**
 * Types of objects that can be listened for events to
 */
export type EventType = 'container' | 'image' | 'network' | 'volume' | 'daemon' | 'plugin' | 'config' | 'secret' | 'service' | 'node' | 'task' | 'engine' | string;

/**
 * Types of event actions that can be listened for. Many more beyond these exist.
 */
export type EventAction = 'create' | 'destroy' | 'delete' | 'start' | 'stop' | 'restart' | 'pause' | 'update' | string;

/**
 * Options for the Event Stream command
 */
export type EventStreamCommandOptions = CommonCommandOptions & {
    /**
     * Return events since a given timestamp
     */
    since?: string | number;
    /**
     * Only stream events until a given timestamp
     */
    until?: string | number;
    /**
     * Only listen for events affecting these object types
     */
    types?: EventType[];
    /**
     * Only listen for events with these labels
     */
    labels?: LabelFilters;
    /**
     * Only listen for events of these types
     */
    events?: EventAction[];
};

/**
 * The items returned by the Event Stream command
 */
export type EventItem = {
    /**
     * The event type
     */
    type: EventType;
    /**
     * The event action
     */
    action: EventAction;
    /**
     * The timestamp of the event
     */
    timestamp: Date;
    /**
     * Details about the affected object
     */
    actor: {
        id: string;
        attributes: Record<string, unknown>;
    }
    /**
     * The RAW event output
     */
    raw: string;
};

type GetEventStreamCommand = {
    /**
     * Generate a CommandResponse for an event stream
     * @param options Command options
     */
    getEventStream(options: EventStreamCommandOptions): Promise<GeneratorCommandResponse<EventItem>>;
};

// #region Login/Logout commands

// Login Command Types

/**
 * Standardized options for login
 */
export type LoginCommandOptions = CommonCommandOptions & {
    /**
     * The username to log in with.
     */
    username: string;
    /**
     * The `--password-stdin` flag will always be used. This value must be set to `true`; any other value will be ignored.
     * The command runner is responsible for piping the password to the stdin stream.
     */
    passwordStdIn: true;
    /**
     * (Optional) The registry to log in to
     */
    registry?: string;
};

type LoginCommand = {
    /**
     * Log in to a Docker registry
     * @param options Command options
     */
    login(options: LoginCommandOptions): Promise<VoidCommandResponse>;
};

// Logout Command Types

/**
 * Standardized options for logout
 */
export type LogoutCommandOptions = CommonCommandOptions & {
    /**
     * (Optional) The registry to log out from
     */
    registry?: string;
};

type LogoutCommand = {
    /**
     * Log out from a Docker registry
     * @param options Command options
     */
    logout(options: LogoutCommandOptions): Promise<VoidCommandResponse>;
};

// #endregion

// #region Image Commands

// Build Image Command Types

/**
 * Target platform for the image build
 */
export type ContainerPlatform = {
    /**
     * OS of target platform
     */
    os?: string;
    /**
     * Architecture of target platform
     */
    architecture?: string;
};

/**
 * Standard options for all supported runtimes when building an image
 */
export type BuildImageCommandOptions = CommonCommandOptions & {
    /**
     * The path to use for the build image context
     */
    path: string;
    /**
     * Optionally specify a specific Dockerfile to build
     */
    file?: string;
    /**
     * Optionally specify a stage to build (defaults to all stages)
     */
    stage?: string;
    /**
     * Optional tags for the built image (defaults to latest)
     */
    tags?: Array<string> | string;
    /**
     * Should base images always be pulled even if they're already present?
     */
    pull?: boolean;
    /**
     * Explicitly disable or enable the optional content trust feature
     */
    disableContentTrust?: boolean;
    /**
     * Optional labels for the built image
     */
    labels?: Labels;
    /**
     * Optional arguments that can be used to override Dockerfile behavior
     */
    args?: Record<string, string>;
    /**
     * Optional file to write the ID of the built image to
     */
    imageIdFile?: string;
    /**
     * Target platform for the image build
     */
    platform?: ContainerPlatform;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

type BuildImageCommand = {
    /**
     * Generate a CommandResponse for building a container image.
     * @param options Command options
     */
    buildImage(options: BuildImageCommandOptions): Promise<VoidCommandResponse>;
};

// List Images Command Types

/**
 * Standardized options for list images commands
 */
export type ListImagesCommandOptions = CommonCommandOptions & {
    /**
     * List all images?
     */
    all?: boolean;
    /**
     * List dangling images?
     */
    dangling?: boolean;
    /**
     * Any labels to filter on when listing images
     */
    labels?: LabelFilters;
    /**
     * Listed images must reference the given base image(s)
     */
    references?: Array<string>;
};

export type ListImagesItem = {
    /**
     * The ID of the image
     */
    id: string;
    /**
     * Image name information
     */
    image: ImageNameInfo;
    /**
     * The date the image was created
     */
    createdAt: Date;
    /**
     * The size (in bytes) of the image
     */
    size?: number;
};

type ListImagesCommand = {
    /**
     * Generate a CommandResponse for listing images
     * @param options Command options
     */
    listImages(options: ListImagesCommandOptions): Promise<PromiseCommandResponse<Array<ListImagesItem>>>;
};

// Remove Images Command Types

export type RemoveImagesCommandOptions = CommonCommandOptions & {
    /**
     * Image names/IDs/etc. to remove, passed directly to the CLI
     */
    imageRefs: Array<string>;
    /**
     * Force remove images even if there are running containers
     */
    force?: boolean;
};

type RemoveImagesCommand = {
    /**
     * Generate a CommandResponse for removing image(s).
     * @param options Command options
     */
    removeImages(options: RemoveImagesCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Prune Images Command Types

/**
 * Standardized options for prune image commands
 */
export type PruneImagesCommandOptions = CommonCommandOptions & {
    /**
     * Prune all images?
     */
    all?: boolean;
};

/**
 * Results from pruning images
 */
export type PruneImagesItem = {
    /**
     * A list of the image names/IDs/etc. deleted
     */
    imageRefsDeleted?: string[];

    /**
     * The amount of space (in bytes) reclaimed
     */
    spaceReclaimed?: number;
};

type PruneImagesCommand = {
    /**
     * Generate a CommandResponse for pruning images
     * @param options Command options
     */
    pruneImages(options: PruneImagesCommandOptions): Promise<PromiseCommandResponse<PruneImagesItem>>;
};

// Pull Image Command Types

/**
 * Standardized options for pull image commands
 */
export type PullImageCommandOptions = CommonCommandOptions & {
    /**
     * The specific image to pull (registry/name:tag format), passed directly to CLI
     */
    imageRef: string;
    /**
     * Should all tags for the given image be pulled or just the given tag?
     */
    allTags?: boolean;
    /**
     * Disable or enable optional content trust settings for the remote repo
     */
    disableContentTrust?: boolean;
};

type PullImageCommand = {
    /**
     * Generate a CommandResponse for pulling an image.
     * @param options Command options
     */
    pullImage(options: PullImageCommandOptions): Promise<VoidCommandResponse>;
};

// Push Image Command Types

/**
 * Standardized options for push image commands
 */
export type PushImageCommandOptions = CommonCommandOptions & {
    /**
     * The specific image to push (registry/name:tag format), passed directly to CLI
     */
    imageRef: string;
};

type PushImageCommand = {
    /**
     * Generate a CommandResponse for pushing an image.
     * @param options Command options
     */
    pushImage(options: PushImageCommandOptions): Promise<VoidCommandResponse>;
};

// Tag Image Command Types

export type TagImageCommandOptions = CommonCommandOptions & {
    /**
     * The base image to add an additional tag to, passed directly to CLI
     */
    fromImageRef: string;
    /**
     * The new image with tag for the existing image, passed directly to CLI
     */
    toImageRef: string;
};

type TagImageCommand = {
    /**
     * Generate a CommandResponse for adding an additional tag to an existing
     * image.
     * @param options Command options
     */
    tagImage(options: TagImageCommandOptions): Promise<VoidCommandResponse>;
};

// Inspect Image Command Types

export type InspectImagesItem = {
    /**
     * The image ID
     */
    id: string;
    /**
     * Image name information
     */
    image: ImageNameInfo;
    /**
     * Repo digest values
     */
    repoDigests: string[];
    /**
     * Is the image local only?
     */
    isLocalImage: boolean;
    /**
     * Any environment variables associated with the image
     */
    environmentVariables: Record<string, string>;
    /**
     * Any default ports exposed by the image
     */
    ports: Array<PortBinding>;
    /**
     * Any volumes defined by the image
     */
    volumes: Array<string>;
    /**
     * Any labels assigned to the image
     */
    labels: Record<string, string>;
    /**
     * The entrypoint for running the image in a container
     */
    entrypoint: Array<string>;
    /**
     * The command used to start the image in a container
     */
    command: Array<string>;
    /**
     * The default working directory in the image
     */
    currentDirectory?: string;
    /**
     * The image architecture
     */
    architecture?: "amd64" | "arm64";
    /**
     * The image operating system
     */
    operatingSystem?: ContainerOS;
    /**
     * The date the image was created
     */
    createdAt: Date;
    /**
     * The default user in the container
     */
    user?: string;
    /**
     * The RAW inspect output
     */
    raw: string;
};

/**
 * Options for inspecting images
 */
export type InspectImagesCommandOptions = CommonCommandOptions & {
    /**
     * The image names/IDs/etc. to inspect, passed directly to the CLI
     */
    imageRefs: Array<string>;
};

type InspectImagesCommand = {
    /**
     * Generate a CommandResponse for inspecting images
     * @param options Command options
     */
    inspectImages(options: InspectImagesCommandOptions): Promise<PromiseCommandResponse<Array<InspectImagesItem>>>;
};

//#endregion

//#region Container commands

// Run Container Command Types

export type PortBinding = {
    /**
     * The internal container port
     */
    containerPort: number;
    /**
     * The optional host port to bind to the container port
     */
    hostPort?: number;
    /**
     * The optional host IP to bind the port on
     */
    hostIp?: string;
    /**
     * The protocol the port uses
     */
    protocol?: 'udp' | 'tcp';
};

export type RunContainerBindMount = {
    type: 'bind';
    source: string;
    destination: string;
    readOnly: boolean;
};

export type RunContainerVolumeMount = {
    type: 'volume';
    source: string;
    destination: string;
    readOnly: boolean;
};

export type RunContainerMount =
    | RunContainerBindMount
    | RunContainerVolumeMount;

export type RunContainerExtraHost = {
    hostname: string;
    ip: string;
};

export type RunContainerCommandOptions = CommonCommandOptions & {
    /**
     * The image name/ID/etc. to run, passed directly to CLI
     */
    imageRef: string;
    /**
     * Optional name to give the new container
     */
    name?: string;
    /**
     * Should the container be run detached?
     */
    detached?: boolean;
    /**
     * Should the container be run interactive?
     */
    interactive?: boolean;
    /**
     * Should the container be removed when it exits?
     */
    removeOnExit?: boolean;
    /**
     * Optional labels to assign to the container
     */
    labels?: Labels;
    /**
     * Optional ports to expose for the container
     */
    ports?: Array<PortBinding>;
    /**
     * Should all exposed ports get automatic host bindings?
     */
    publishAllPorts?: boolean;
    /**
     * A network to connect to the container
     */
    network?: string;
    /**
     * A network-scoped alias for the container
     */
    networkAlias?: string;
    /**
     * Extra host-to-IP mappings
     */
    addHost?: Array<RunContainerExtraHost>;
    /**
     * Mounts to attach to the container
     */
    mounts?: Array<RunContainerMount>;
    /**
     * Environment variables to set for the container
     */
    environmentVariables?: Record<string, string>;
    /**
     * Environment files for the container
     */
    environmentFiles?: string[];
    /**
     * Rule for pulling base images
     */
    pull?: "always" | "missing" | "never";
    /**
     * Optional entrypoint for running the container
     */
    entrypoint?: string;
    /**
     * Optional command to use in starting the container
     */
    command?: Array<string> | string;
    /**
     * Optional expose ports for the container
     */
    exposePorts?: Array<number>;
    /**
     * Additional custom options to pass
     */
    customOptions?: string;
};

type RunContainerCommand = {
    /**
     * Generate a CommandResponse for running a container.
     * @param options Command options
     */
    runContainer(options: RunContainerCommandOptions): Promise<PromiseCommandResponse<string | undefined>>;
};

// Exec Container Command Types

export type ExecContainerCommandOptions = CommonCommandOptions & {
    /**
     * The container to execute a command in
     */
    container: string;
    /**
     * Should the command be run interactive?
     */
    interactive?: boolean;
    /**
     * Should the command be run detached?
     */
    detached?: boolean;
    /**
     * Should a tty terminal be associated with the execution?
     */
    tty?: boolean;
    /**
     * Environment variables to set for the command
     */
    environmentVariables?: Record<string, string>;
    /**
     * The command to run in the container
     */
    command: Array<string | ShellQuotedString> | string | ShellQuotedString;
};

type ExecContainerCommand = {
    /**
     * Generate a CommandResponse for executing a command in a running container.
     * @param options Command options
     */
    execContainer(options: ExecContainerCommandOptions): Promise<GeneratorCommandResponse<string>>;
};

// List Containers Command Types

export type ListContainersCommandOptions = CommonCommandOptions & {
    /**
     * Should all containers be listed?
     */
    all?: boolean;
    /**
     * Should only running containers be listed?
     */
    running?: boolean;
    /**
     * Should exited containers be listed?
     */
    exited?: boolean;
    /**
     * Only list containers with matching labels
     */
    labels?: LabelFilters;
    /**
     * Only list containers with matching names
     */
    names?: Array<string>;
    /**
     * Only list containers with matching image full IDs as ancestors
     */
    imageAncestors?: Array<string>;
    /**
     * Only list containers using matching volumes
     */
    volumes?: Array<string>;
    /**
     * Only list containers using matching networks
     */
    networks?: Array<string>;
};

export type ListContainersItem = {
    /**
     * The ID of the container
     */
    id: string;
    /**
     * The name of the container
     */
    name: string;
    /**
     * Labels on the container
     */
    labels: Labels;
    /**
     * Image name information
     */
    image: ImageNameInfo;
    /**
     * The exposed ports for the container
     */
    ports: Array<PortBinding>;
    /**
     * The list of connected networks for the container
     */
    networks: string[];
    /**
     * The date the container was created
     */
    createdAt: Date;
    /**
     * The container state (e.g. 'running', 'stopped', 'paused', etc.)
     */
    state: string;
    /**
     * The container status (e.g. 'Up 5 minutes', 'Exited (0) 1 minute ago', etc.)
     */
    status?: string;
};

type ListContainersCommand = {
    /**
     * Generate a CommandResponse for listing containers.
     * @param options Command options
     */
    listContainers(options: ListContainersCommandOptions): Promise<PromiseCommandResponse<Array<ListContainersItem>>>;
};

// Stop Containers Command Types

export type StopContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to stop
     */
    container: Array<string>;
    /**
     * Time to wait for graceful exit before halting the container
     */
    time?: number;
};

type StopContainersCommand = {
    /**
     * Generate a CommandResponse for stopping container(s).
     * @param options Command options
     */
    stopContainers(options: StopContainersCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Start Containers Command Types

export type StartContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to start
     */
    container: Array<string>;
};

type StartContainersCommand = {
    /**
     * Generate a CommandResponse for starting container(s).
     * @param options Command options
     */
    startContainers(options: StartContainersCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Restart Containers Command Types

export type RestartContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to restart
     */
    container: Array<string>;
};

type RestartContainersCommand = {
    /**
     * Generate a CommandResponse for restarting container(s).
     * @param options Command options
     */
    restartContainers(options: RestartContainersCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Remove Containers Command Types

export type RemoveContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to remove
     */
    containers: Array<string>;
    /**
     * Force remove containers even if they aren't stopped?
     */
    force?: boolean;
};

type RemoveContainersCommand = {
    /**
     * Generate a CommandResponse for removing container(s).
     * @param options Command options
     */
    removeContainers(options: RemoveContainersCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Prune Containers Command Types

export type PruneContainersCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

/**
 * Results from pruning containers
 */
export type PruneContainersItem = {
    /**
     * A list of the containers deleted
     */
    containersDeleted?: string[];

    /**
     * The amount of space (in bytes) reclaimed
     */
    spaceReclaimed?: number;
};

type PruneContainersCommand = {
    pruneContainers(options: PruneContainersCommandOptions): Promise<PromiseCommandResponse<PruneContainersItem>>
};

// Logs For Container Command Types

export type LogsForContainerCommandOptions = CommonCommandOptions & {
    /**
     * Container to return logs from
     */
    container: string;
    /**
     * Return the logs in follow mode (new entries are streamed as added) vs.
     * just returning the current logs at the time the command was run
     */
    follow?: boolean;
    /**
     * Optionally start returning log entries a given number of lines from the end
     */
    tail?: number;
    /**
     * Only return log entries since a given timestamp
     */
    since?: string;
    /**
     * Only return log entries before a given timestamp
     */
    until?: string;
    /**
     * Include timestamps for each returned log entry
     */
    timestamps?: boolean;
};

type LogsForContainerCommand = {
    /**
     * Generate a CommandResponse for retrieving container logs
     * @param options Command options
     */
    logsForContainer(options: LogsForContainerCommandOptions): Promise<GeneratorCommandResponse<string>>;
};

// Inspect Container Command Types

/**
 * Options for inspecting containers
 */
export type InspectContainersCommandOptions = CommonCommandOptions & {
    /**
     * Containers to inspect
     */
    containers: Array<string>;
};

export type InspectContainersItemBindMount = {
    type: 'bind';
    /**
     * The source of the bind mount (path on host)
     */
    source: string;
    /**
     * The destination for the bind mount (path in container)
     */
    destination: string;
    /**
     * Is the mount read only?
     */
    readOnly: boolean;
};

export type InspectContainersItemVolumeMount = {
    type: 'volume';
    /**
     * The source of the volume mount (volume name)
     */
    source: string;
    /**
     * The destination for the volume mount (path in container)
     */
    destination: string;
    /**
     * The volume driver used
     */
    driver?: string;
    /**
     * Is the volume read only?
     */
    readOnly: boolean;
};

export type InspectContainersItemMount =
    | InspectContainersItemBindMount
    | InspectContainersItemVolumeMount;

export type InspectContainersItemNetwork = {
    /**
     * The name of the network
     */
    name: string;
    /**
     * The network gateway address
     */
    gateway?: string;
    /**
     * The root IP address of the network
     */
    ipAddress?: string;
    /**
     * The MAC address associated with the network
     */
    macAddress?: string;
};

export type InspectContainersItem = {
    /**
     * The ID of the container
     */
    id: string;
    /**
     * The name of the container
     */
    name: string;
    /**
     * The ID of the image used to run the container
     */
    imageId: string;
    /**
     * Image name information
     */
    image: ImageNameInfo;
    /**
     * Isolation Mode of the container
     */
    isolation?: string;
    /**
     * The status of the container
     */
    status?: string;
    /**
     * Environment variables set when running the container
     */
    environmentVariables: Record<string, string>;
    /**
     * Networks attachd to the container
     */
    networks: Array<InspectContainersItemNetwork>;
    /**
     * IP Address assigned to the container
     */
    ipAddress?: string;
    /**
     * The container operating system
     */
    operatingSystem?: ContainerOS;
    /**
     * Ports exposed for the container
     */
    ports: Array<PortBinding>;
    /**
     * Mounts attached to the container
     */
    mounts: Array<InspectContainersItemMount>;
    /**
     * Labels assigned to the container
     */
    labels: Record<string, string>;
    /**
     * The entrypoint used to start the container
     */
    entrypoint: Array<string>;
    /**
     * The command used to run the container
     */
    command: Array<string>;
    /**
     * The default working directory in the container
     */
    currentDirectory?: string;
    /**
     * The date the container was created
     */
    createdAt: Date;
    /**
     * The date the container was started
     */
    startedAt?: Date;
    /**
     * The date the container stopped
     */
    finishedAt?: Date;
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectContainersCommand = {
    /**
     * Generate a CommandResponse for inspecting containers.
     * @param options Command options
     */
    inspectContainers(options: InspectContainersCommandOptions): Promise<PromiseCommandResponse<Array<InspectContainersItem>>>;
};

// Stats command types

/**
 * Options for container stats
 */
export type ContainersStatsCommandOptions = CommonCommandOptions & {
    all?: boolean;
};

type ContainersStatsCommand = {
    /**
     * Show running container stats
     * @param options Command options
     */
    statsContainers(options: ContainersStatsCommandOptions): Promise<PromiseCommandResponse<string>>;
};

// #endregion

// #region Volume commands

// Create Volume Command Types

export type CreateVolumeCommandOptions = CommonCommandOptions & {
    /**
     * The name for the volume
     */
    name: string;
    /**
     * Optional driver to use for the volume
     */
    driver?: string;
};

type CreateVolumeCommand = {
    /**
     * Generate a CommandResponse for creating a volume
     * @param options Command options
     */
    createVolume(options: CreateVolumeCommandOptions): Promise<VoidCommandResponse>;
};

// List Volumes Command Types

export type ListVolumesCommandOptions = CommonCommandOptions & {
    /**
     * Only list volumes that match the given labels
     */
    labels?: LabelFilters;
    /**
     * Include dangling volumes?
     */
    dangling?: boolean;
    /**
     * Only list volumes with a given driver
     */
    driver?: string;
};

export type ListVolumeItem = {
    /**
     * The name of the volume
     */
    name: string;
    /**
     * The volume driver
     */
    driver: string;
    /**
     * Labels assigned to the volume
     */
    labels: Labels;
    /**
     * The mount point for the volume
     */
    mountpoint: string;
    /**
     * The scope for the volume
     */
    scope: string;
    /**
     * The date the volume was created at
     */
    createdAt?: Date;
    /**
     * The size (in bytes) of the volume
     */
    size?: number;
};

type ListVolumesCommand = {
    /**
     * Generate a CommandResponse for listing volumes
     * @param options Command options
     */
    listVolumes(options: ListVolumesCommandOptions): Promise<PromiseCommandResponse<Array<ListVolumeItem>>>;
};

// Remove Volumes Command Types

export type RemoveVolumesCommandOptions = CommonCommandOptions & {
    /**
     * Volumes to remove
     */
    volumes: Array<string>;
    /**
     * Force removing volumes even if they're attached to a container?
     */
    force?: boolean;
};

type RemoveVolumesCommand = {
    /**
     * Generate a CommandResponse for removing volumes
     * @param options Command options
     */
    removeVolumes(options: RemoveVolumesCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Prune Volumes Command Types

/**
 * Standardized options for prune volume commands
 */
export type PruneVolumesCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

/**
 * Results from pruning volumes
 */
export type PruneVolumesItem = {
    /**
     * A list of the volumes deleted
     */
    volumesDeleted?: string[];

    /**
     * The amount of space (in bytes) reclaimed
     */
    spaceReclaimed?: number;
};

type PruneVolumesCommand = {
    /**
     * Generate a CommandResponse for pruning volumes
     * @param options Command options
     */
    pruneVolumes(options: PruneVolumesCommandOptions): Promise<PromiseCommandResponse<PruneVolumesItem>>;
};

// Inspect Volumes Command Types

/**
 * Options for inspecting volumes
 */
export type InspectVolumesCommandOptions = CommonCommandOptions & {
    /**
     * Volumes to inspect
     */
    volumes: Array<string>;
};

export type InspectVolumesItem = {
    /**
     * The name of the volume
     */
    name: string;
    /**
     * The driver for the volume
     */
    driver: string;
    /**
     * The mount point for the volume
     */
    mountpoint: string;
    /**
     * The scope for the volume
     */
    scope: string;
    /**
     * Labels assigned to the volume
     */
    labels: Record<string, string>;
    /**
     * Driver-specific options for the volume
     */
    options: Record<string, unknown>;
    /**
     * The date the volume was created
     */
    createdAt: Date;
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectVolumesCommand = {
    /**
     * Generate a CommandResponse for inspecting volumes.
     * @param options Command options
     */
    inspectVolumes(options: InspectVolumesCommandOptions): Promise<PromiseCommandResponse<Array<InspectVolumesItem>>>;
};

// #endregion

// #region Network commands

// Create Network Command Types

export type CreateNetworkCommandOptions = CommonCommandOptions & {
    /**
     * The name for the network
     */
    name: string;
    /**
     * Optional driver to use for the network
     */
    driver?: string;
};

type CreateNetworkCommand = {
    /**
     * Generate a CommandResponse for creating a network
     * @param options Command options
     */
    createNetwork(options: CreateNetworkCommandOptions): Promise<VoidCommandResponse>;
};

// List Networks Command Types

export type ListNetworksCommandOptions = CommonCommandOptions & {
    /**
     * Only list networks that match the given labels
     */
    labels?: LabelFilters;
    /**
     * Only list networks with a given driver
     */
    driver?: string;
};

export type ListNetworkItem = {
    /**
     * The name of the network
     */
    name: string;
    /**
     * The ID of the network
     */
    id: string;
    /**
     * The network driver
     */
    driver: string;
    /**
     * Labels assigned to the network
     */
    labels: Labels;
    /**
     * The network scope
     */
    scope: string;
    /**
     * True if IPv6 network
     */
    ipv6: boolean;
    /**
     * The date the network was created
     */
    createdAt: Date;
    /**
     * True if internal network
     */
    internal: boolean;
};

type ListNetworksCommand = {
    /**
     * Generate a CommandResponse for listing networks
     * @param options Command options
     */
    listNetworks(options: ListNetworksCommandOptions): Promise<PromiseCommandResponse<Array<ListNetworkItem>>>;
};

// Remove Networks Command Types

export type RemoveNetworksCommandOptions = CommonCommandOptions & {
    /**
     * Networks to remove
     */
    networks: Array<string>;
    /**
     * Force removing networks even if they're attached to a container?
     */
    force?: boolean;
};

type RemoveNetworksCommand = {
    /**
     * Generate a CommandResponse for removing networks
     * @param options Command options
     */
    removeNetworks(options: RemoveNetworksCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Prune Networks Command Types

/**
 * Standardized options for prune network commands
 */
export type PruneNetworksCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

/**
 * Results from pruning networks
 */
export type PruneNetworksItem = {
    /**
     * A list of the networks deleted
     */
    networksDeleted?: string[];
};

type PruneNetworksCommand = {
    /**
     * Generate a CommandResponse for pruning networks
     * @param options Command options
     */
    pruneNetworks(options: PruneNetworksCommandOptions): Promise<PromiseCommandResponse<PruneNetworksItem>>;
};

// Inspect Networks Command Types

/**
 * Options for inspecting networks
 */
export type InspectNetworksCommandOptions = CommonCommandOptions & {
    /**
     * Networks to inspect
     */
    networks: Array<string>;
};

export type NetworkIpamConfig = {
    driver: string;
    config: {
        subnet: string;
        gateway: string;
    }[];
};

export type InspectNetworksItem = {
    /**
     * The name of the network
     */
    name: string;
    /**
     * The ID of the network
     */
    id: string;
    /**
     * The network driver
     */
    driver: string;
    /**
     * Labels assigned to the network
     */
    labels: Labels;
    /**
     * The network scope
     */
    scope: string;
    /**
     * The IPAM config
     */
    ipam: NetworkIpamConfig;
    /**
     * True if IPv6 network
     */
    ipv6: boolean;
    /**
     * True if internal network
     */
    internal: boolean;
    /**
     * True if attachable
     */
    attachable: boolean;
    /**
     * True if ingress
     */
    ingress: boolean;
    /**
     * The date the network was created
     */
    createdAt: Date;
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectNetworksCommand = {
    /**
     * Generate a CommandResponse for inspecting networks.
     * @param options Command options
     */
    inspectNetworks(options: InspectNetworksCommandOptions): Promise<PromiseCommandResponse<Array<InspectNetworksItem>>>;
};

// #endregion

// #region Context commands

// List Contexts Command Types

export type ListContextsCommandOptions = CommonCommandOptions & {
    // Intentionally empty for now
};

export type ListContextItem = {
    /**
     * The name of the context
     */
    name: string;
    /**
     * The description of the context
     */
    description?: string;
    /**
     * Whether or not the context is currently selected
     */
    current: boolean;
    /**
     * The endpoint used for the container daemon
     */
    containerEndpoint?: string;
};

type ListContextsCommand = {
    /**
     * Generate a CommandResponse for listing contexts
     * @param options Command options
     */
    listContexts(options: ListContextsCommandOptions): Promise<PromiseCommandResponse<Array<ListContextItem>>>;
};

// Remove Contexts Command Types

export type RemoveContextsCommandOptions = CommonCommandOptions & {
    /**
     * Contexts to remove
     */
    contexts: Array<string>;
};

type RemoveContextsCommand = {
    /**
     * Generate a CommandResponse for removing contexts
     * @param options Command options
     */
    removeContexts(options: RemoveContextsCommandOptions): Promise<PromiseCommandResponse<Array<string>>>;
};

// Use Context Command Types

export type UseContextCommandOptions = CommonCommandOptions & {
    /**
     * Context to use
     */
    context: string;
};

type UseContextCommand = {
    /**
     * Generate a CommandResponse for using a context
     * @param options Command options
     */
    useContext(options: UseContextCommandOptions): Promise<VoidCommandResponse>;
};

// Inspect Contexts Command Types

/**
 * Options for inspecting contexts
 */
export type InspectContextsCommandOptions = CommonCommandOptions & {
    /**
     * Contexts to inspect
     */
    contexts: Array<string>;
};

export type InspectContextsItem = {
    /**
     * The name of the context
     */
    name: string;
    /**
     * The description of the context
     */
    description?: string;
    // More properties exist but are highly dependent on container runtime
    /**
     * The raw JSON from the inspect record
     */
    raw: string;
};

type InspectContextsCommand = {
    /**
     * Generate a CommandResponse for inspecting contexts.
     * @param options Command options
     */
    inspectContexts(options: InspectContextsCommandOptions): Promise<PromiseCommandResponse<Array<InspectContextsItem>>>;
};

// #endregion

// #region Container filesystem commands

// List files command types

export type ListFilesCommandOptions = CommonCommandOptions & {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of a directory in the container to list the contents of
     */
    path: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

export type ListFilesItem = {
    /**
     * The name of the file/directory
     */
    name: string;
    /**
     * The absolute path of the file/directory within the container
     */
    path: string;
    /**
     * The size of the file (0 if a directory), in bytes
     */
    size: number;
    /**
     * The type of the file item (file/directory)
     */
    type: FileType;
    /**
     * The mode (permissions) of the file in base 10
     */
    mode?: number;
    /**
     * The (container) uid of the user the file belongs to
     */
    uid?: number;
    /**
     * The (container) gid of the user the file belongs to
     */
    gid?: number;
    /**
     * The modification time of the file/directory, in milliseconds since Unix epoch
     */
    mtime?: number;
    /**
     * The creation time of the file/directory, in milliseconds since Unix epoch
     */
    ctime?: number;
    /**
     * The access time of the file/directory, in milliseconds since Unix epoch
     */
    atime?: number;
};

type ListFilesCommand = {
    /**
     * Lists the contents of a given path in a container
     * @param options Command options
     */
    listFiles(options: ListFilesCommandOptions): Promise<PromiseCommandResponse<Array<ListFilesItem>>>;
};

// Stat path command types

export type StatPathCommandOptions = CommonCommandOptions & {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of a file or directory in the container to get stats for
     */
    path: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

export type StatPathItem = ListFilesItem;

type StatPathCommand = {
    /**
     * Gets stats for a given file in a container
     * @param options Command options
     */
    statPath(options: StatPathCommandOptions): Promise<PromiseCommandResponse<StatPathItem | undefined>>;
};

// Read file command types

export type ReadFileCommandOptions = CommonCommandOptions & {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of the file in the container to read
     */
    path: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

type ReadFileCommand = {
    /**
     * Read a file inside the container. Start a process with the {@link CommandResponse}
     * and read from its stdout stream (or use {@link ShellCommandRunnerFactory} to accumulate
     * the output into a string and return it from `parse`).
     * NOTE: the output stream is in tarball format with Linux containers, and cleartext with Windows containers.
     * @param options Command options
     */
    readFile(options: ReadFileCommandOptions): Promise<GeneratorCommandResponse<Buffer>>;
};

// Write file command types

export type WriteFileCommandOptions = CommonCommandOptions & {
    /**
    * The container to execute a command in
    */
    container: string;
    /**
     * The absolute path of the **directory** in the container to write files into
     */
    path: string;
    /**
     * (Optional) The file or directory on the host to copy into the container. If not given, it is necessary
     * to write the file contents to stdin in the command runner.
     */
    inputFile?: string;
    /**
     * The container operating system. If not supplied, 'linux' will be assumed.
     */
    operatingSystem?: ContainerOS;
};

type WriteFileCommand = {
    /**
     * Write a file inside the container. Start a process with the {@link CommandResponse}
     * and write to its stdin stream.
     * NOTE: the input stream must be in tarball format.
     * NOTE: this command is not supported on Windows containers.
     * @param options Command options
     */
    writeFile(options: WriteFileCommandOptions): Promise<VoidCommandResponse>;
};

// #endregion

/**
 * Standard interface for executing commands against container runtimes.
 * Individual runtimes implement this interface.
 */
export interface IContainersClient extends
    ClientIdentity,
    ImageNameDefaults,
    VersionCommand,
    CheckInstallCommand,
    InfoCommand,
    GetEventStreamCommand,
    LoginCommand,
    LogoutCommand,
    // Image Commands
    BuildImageCommand,
    ListImagesCommand,
    RemoveImagesCommand,
    PruneImagesCommand,
    PullImageCommand,
    TagImageCommand,
    InspectImagesCommand,
    PushImageCommand,
    // Container Commands
    RunContainerCommand,
    ExecContainerCommand,
    ListContainersCommand,
    StartContainersCommand,
    RestartContainersCommand,
    StopContainersCommand,
    RemoveContainersCommand,
    PruneContainersCommand,
    LogsForContainerCommand,
    InspectContainersCommand,
    ContainersStatsCommand,
    // Volume Commands
    CreateVolumeCommand,
    ListVolumesCommand,
    RemoveVolumesCommand,
    PruneVolumesCommand,
    InspectVolumesCommand,
    // Network Commands
    CreateNetworkCommand,
    ListNetworksCommand,
    RemoveNetworksCommand,
    PruneNetworksCommand,
    InspectNetworksCommand,
    // Context commands
    ListContextsCommand,
    RemoveContextsCommand,
    UseContextCommand,
    InspectContextsCommand,
    // Filesystem commands
    ListFilesCommand,
    StatPathCommand,
    ReadFileCommand,
    WriteFileCommand { }
