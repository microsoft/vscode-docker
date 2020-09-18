/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

/**
 * This is the external face of extension.bundle.js, the main webpack bundle for the extension.
 * Anything needing to be exposed outside of the extension sources must be exported from here, because
 * everything else will be in private modules in extension.bundle.js.
 */

// Export activate and deactivate for main.js
export { activateInternal } from './src/extension';
export { deactivateInternal } from './src/extension';

// Exports for tests
// The tests are not packaged with the webpack bundle and therefore only have access to code exported from this file.
//
// The tests should import '../extension.bundle.ts'. At design-time they live in tests/ and so will pick up this file (extension.bundle.ts).
// At runtime the tests live in dist/tests and will therefore pick up the main webpack bundle at dist/extension.bundle.js.
export { configPrefix } from './src/constants';
export { CommandLineBuilder } from './src/utils/commandLineBuilder';
export { delay } from './src/utils/promiseUtils';
export { Lazy, AsyncLazy } from './src/utils/lazy';
export { bufferToString } from './src/utils/spawnAsync';
export { ext } from './src/extensionVariables';
export { httpsRequestBinary } from './src/utils/httpRequest';
export { IKeytar } from './src/utils/keytar';
export { inferCommand, inferPackageName, InspectMode, NodePackage } from './src/utils/nodeUtils';
export { nonNullProp } from './src/utils/nonNull';
export { getDockerOSType } from "./src/utils/osUtils";
export { Platform, PlatformOS } from './src/utils/platform';
export { trimWithElipsis } from './src/utils/trimWithElipsis';
export { recursiveFindTaskByType } from './src/tasks/TaskHelper';
export { TaskDefinitionBase } from './src/tasks/TaskDefinitionBase';
export { DebugConfigurationBase } from './src/debugging/DockerDebugConfigurationBase';
export { ActivityMeasurementService } from './src/telemetry/ActivityMeasurementService';
export { ExperimentationTelemetry } from './src/telemetry/ExperimentationTelemetry';
export { DockerApiClient } from './src/docker/DockerApiClient';
export { DockerContext, isNewContextType } from './src/docker/Contexts';
export { DockerContainer } from './src/docker/Containers';
export { DockerImage } from './src/docker/Images';
export { DockerNetwork } from './src/docker/Networks';
export { DockerVolume } from './src/docker/Volumes';
export { CommandTemplate, selectCommandTemplate, defaultCommandTemplates } from './src/commands/selectCommandTemplate';

export * from 'vscode-azureextensionui';
