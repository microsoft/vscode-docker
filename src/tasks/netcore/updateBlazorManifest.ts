/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from 'path';
import { l10n } from 'vscode';
import * as xml2js from 'xml2js';
import { getNetCoreProjectInfo } from '../../utils/netCoreUtils';
import { pathNormalize } from '../../utils/pathNormalize';
import { PlatformOS } from '../../utils/platform';
import { DockerContainerVolume } from '../DockerRunTaskDefinitionBase';
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

interface XmlManifest {
    StaticWebAssets: StaticWebAssets;
}

interface JsonManifest {
    ContentRoots: string[];
}

export async function updateBlazorManifest(context: DockerRunTaskContext, runDefinition: DockerRunTaskDefinition): Promise<void> {
    const contents = await getNetCoreProjectInfo('GetBlazorManifestLocations', runDefinition.netCore.appProject);

    if (contents.length < 2) {
        throw new Error(l10n.t('Unable to determine Blazor manifest locations from output file.'));
    }

    await transformBlazorManifest(context, contents[0].trim(), contents[1].trim(), runDefinition.dockerRun.volumes, runDefinition.dockerRun.os);
}

async function transformBlazorManifest(context: DockerRunTaskContext, inputManifest: string, outputManifest: string, volumes: DockerContainerVolume[], os: PlatformOS): Promise<void> {
    if (!inputManifest || // Input manifest can't be empty/undefined
        !outputManifest || // Output manifest can't be empty/undefined
        !(await fse.pathExists(inputManifest)) || // Input manifest must exist
        !(await fse.stat(inputManifest)).isFile() || // Input manifest must be a file
        !volumes || // Volumes can't be undefined
        volumes.length === 0) { // Volumes can't be empty
        // This isn't considered an error case, we'll just return without doing anything
        return;
    }

    os = os || 'Linux';

    context.terminal.writeOutputLine(l10n.t('Attempting to containerize Blazor static web assets manifest...'));

    if (path.extname(inputManifest) === '.json') {
        await transformJsonBlazorManifest(inputManifest, outputManifest, volumes, os);
    } else {
        await transformXmlBlazorManifest(inputManifest, outputManifest, volumes, os);
    }
}

async function transformJsonBlazorManifest(inputManifest: string, outputManifest: string, volumes: DockerContainerVolume[], os: PlatformOS): Promise<void> {
    const manifest = <JsonManifest>await fse.readJson(inputManifest);

    if (!manifest?.ContentRoots) {
        throw new Error(l10n.t('Failed to parse Blazor static web assets manifest.'));
    }

    if (!Array.isArray(manifest.ContentRoots)) {
        return;
    }

    manifest.ContentRoots = manifest.ContentRoots.map(cr => tryContainerizePath(cr, volumes, os));

    // Write out a new manifest
    await fse.writeJson(outputManifest, manifest, { spaces: 2 });

    // Set the mtime to 1970 so that next time .NET builds, it will overwrite the output file
    await fse.utimes(outputManifest, 0, 0);
}

async function transformXmlBlazorManifest(inputManifest: string, outputManifest: string, volumes: DockerContainerVolume[], os: PlatformOS): Promise<void> {
    const contents = (await fse.readFile(inputManifest)).toString();
    const manifest = <XmlManifest>await xml2js.parseStringPromise(contents);

    if (!manifest?.StaticWebAssets) {
        throw new Error(l10n.t('Failed to parse Blazor static web assets manifest.'));
    }

    if (!Array.isArray(manifest.StaticWebAssets.ContentRoot)) {
        return;
    }

    for (const contentRoot of manifest.StaticWebAssets.ContentRoot) {
        if (contentRoot && contentRoot.$) {
            contentRoot.$.Path = tryContainerizePath(contentRoot.$.Path, volumes, os);
        }
    }

    const outputContents = (new xml2js.Builder()).buildObject(manifest);

    // Write out a new manifest
    await fse.writeFile(outputManifest, outputContents);

    // Set the mtime to 1970 so that next time .NET builds, it will overwrite the output file
    await fse.utimes(outputManifest, 0, 0);
}

function tryContainerizePath(oldPath: string, volumes: DockerContainerVolume[], os: PlatformOS): string {
    const matchingVolume: DockerContainerVolume = volumes.find(v => oldPath.toLowerCase().startsWith(v.localPath.toLowerCase()));

    return matchingVolume ?
        pathNormalize(matchingVolume.containerPath + oldPath.substring(matchingVolume.localPath.length), os) :
        oldPath;
}
