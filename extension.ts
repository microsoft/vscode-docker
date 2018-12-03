/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is the entrypoint for extension.js, the main webpack bundle for the extension.
 * Anything needing to be exposed outside of the extension sources must be exported from here, because
 * everything else will be in private modules in extension.js.
 */

// Export activate for vscode to call (via entrypoint.js)
export { activateInternal, deactivateInternal } from './dockerExtension';

// Exports for use by the tests, which are not packaged with the webpack bundle and therefore
//   only have access to code exported from this file. The tests should import '../extension.ts' (this file),
//   to access these exports, and at runtime they will pick up dist/extension.js.
export { AsyncPool } from './utils/asyncpool';
export { wrapError } from './utils/wrapError';
export { ext } from './extensionVariables';
export { nonNullProp } from './utils/nonNull';
export { IKeytar } from './utils/keytar';
export { throwDockerConnectionError, internal } from './explorer/utils/dockerConnectionError';
export { getImageOrContainerDisplayName } from './explorer/models/getImageOrContainerDisplayName';
export { trimWithElipsis } from './explorer/utils/utils';
export { isWindows10RS3OrNewer, isWindows10RS4OrNewer } from "./helpers/osVersion";
export { LineSplitter } from './debugging/coreclr/lineSplitter';
export { CommandLineBuilder } from './debugging/coreclr/commandLineBuilder';
export { DockerClient } from './debugging/coreclr/dockerClient';
export { DotNetClient } from './debugging/coreclr/dotNetClient';
export { FileSystemProvider } from './debugging/coreclr/fsProvider';
export { OSProvider } from './debugging/coreclr/osProvider';
export { DockerDaemonIsLinuxPrerequisite, DotNetSdkInstalledPrerequisite, LinuxUserInDockerGroupPrerequisite, MacNuGetFallbackFolderSharedPrerequisite } from './debugging/coreclr/prereqManager';
export { ProcessProvider } from './debugging/coreclr/processProvider';
export { PlatformOS, Platform } from './utils/platform';
export { DockerBuildImageOptions } from "./debugging/coreclr/dockerClient";
export { compareBuildImageOptions } from "./debugging/coreclr/dockerManager";
export { configure, ConfigureApiOptions, ConfigureTelemetryProperties } from './configureWorkspace/configure';
export { globAsync } from './helpers/async';
export { httpsRequestBinary } from './utils/httpRequest';
export { DefaultTerminalProvider } from './commands/utils/TerminalProvider';
export { docker } from './commands/utils/docker-endpoint';
