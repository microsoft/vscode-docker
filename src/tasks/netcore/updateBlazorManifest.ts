/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import * as xml2js from 'xml2js';
import ChildProcessProvider from "../../debugging/coreclr/ChildProcessProvider";
import { DockerContainerVolume } from '../../debugging/coreclr/CliDockerClient';
import LocalOSProvider from "../../debugging/coreclr/LocalOSProvider";
import { OSTempFileProvider } from "../../debugging/coreclr/tempFileProvider";
import { ext } from "../../extensionVariables";
import { pathNormalize } from '../../utils/pathNormalize';
import { PlatformOS } from '../../utils/platform';
import { execAsync } from '../../utils/spawnAsync';
import { DockerRunTaskDefinition } from "../DockerRunTaskProvider";
import { DockerRunTaskContext } from "../TaskHelper";

interface ContentRootAttributes {
    BasePath: string;
    Path: string;
}

interface ContentRoot {
    $: ContentRootAttributes;
}

interface StaticWebAssets {
    ContentRoot: ContentRoot[];
}

interface Manifest {
    StaticWebAssets: StaticWebAssets;
}

export async function updateBlazorManifest(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<void> {
    const tempFileProvider = new OSTempFileProvider(new LocalOSProvider(), new ChildProcessProvider());

    const locationsFile = tempFileProvider.getTempFilename();

    const targetsFile = path.join(ext.context.asAbsolutePath('resources'), 'GetBlazorManifestLocations.targets');

    const command = `dotnet build /r:false /t:GetBlazorManifestLocations /p:CustomAfterMicrosoftCommonTargets=${targetsFile} /p:BlazorManifestLocationsOutput=${locationsFile} ${runDefinition.netCore.appProject}`;

    try {
        await execAsync(command, { timeout: 5000 });

        if (await fse.pathExists(locationsFile)) {
            const contents = (await fse.readFile(locationsFile)).toString().split(/\r?\n/ig);

            if (contents.length < 2) {
                throw new Error('Unable to determine Blazor manifest locations from output file.');
            }

            await transformBlazorManifest(context, contents[0].trim(), contents[1].trim(), runDefinition.dockerRun.volumes, runDefinition.dockerRun.os);
        } else {
            throw new Error('Unable to determine Blazor manifest locations from output file.')
        }
    } finally {
        if (await fse.pathExists(locationsFile)) {
            await fse.unlink(locationsFile);
        }
    }
}

async function transformBlazorManifest(context: DockerRunTaskContext, inputManifest: string, outputManifest: string, volumes: DockerContainerVolume[], os: PlatformOS): Promise<void> {
    if (!inputManifest || // Input manifest can't be empty/undefined
        !outputManifest || // Output manifest can't be empty/undefined
        !(await fse.pathExists(inputManifest)) || // Input manifest must exist
        !volumes || // Volumes can't be undefined
        volumes.length === 0) { // Volumes can't be empty
        // This isn't considered an error case, we'll just return without doing anything
        return;
    }

    os = os || 'Linux';

    context.terminal.writeOutputLine('Attempting to containerize Blazor static web assets manifest...');

    const contents = (await fse.readFile(inputManifest)).toString();
    const manifest: Manifest = <Manifest>await xml2js.parseStringPromise(contents);

    if (!manifest || !manifest.StaticWebAssets) {
        throw new Error('Failed to parse Blazor static web assets manifest.');
    }

    for (const contentRoot of manifest.StaticWebAssets.ContentRoot) {
        if (contentRoot && contentRoot.$) {
            contentRoot.$.Path = containerizePath(contentRoot.$.Path, volumes, os);
        }
    }

    const outputContents = (new xml2js.Builder()).buildObject(manifest);

    await fse.writeFile(outputManifest, outputContents)
}

function containerizePath(oldPath: string, volumes: DockerContainerVolume[], os: PlatformOS): string {
    const matchingVolume: DockerContainerVolume = volumes.find(v => oldPath.startsWith(v.localPath));

    return matchingVolume ?
        pathNormalize(oldPath.replace(matchingVolume.localPath, matchingVolume.containerPath), os) :
        oldPath;
}
