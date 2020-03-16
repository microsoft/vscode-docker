/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Dockerfile, DockerfileParser, Keyword } from 'dockerfile-ast';
import * as fse from 'fs-extra';
import * as path from 'path';
import { localize } from '../localize';
import { pathNormalize } from './pathNormalize';

export interface DockerfileInfo {
    rootFolder?: string;
    dockerfileNameRelativeToRoot: string;
    ports?: number[];
}

export async function parseDockerfile(rootFolderPath: string, dockerfilePath: string): Promise<DockerfileInfo> {
    const content = await readFileContent(dockerfilePath);
    const dockerFile = DockerfileParser.parse(content);
    const ports: number[] = await getExposedPorts(dockerFile);
    let dockerFilenameRelativeToRoot = path.relative(rootFolderPath, dockerfilePath);
    dockerFilenameRelativeToRoot = pathNormalize(dockerFilenameRelativeToRoot, 'Linux')

    return {
        rootFolder: rootFolderPath,
        dockerfileNameRelativeToRoot: dockerFilenameRelativeToRoot,
        ports: ports
    };
}

async function getExposedPorts(dockerFile: Dockerfile): Promise<number[]> {
    const insts = dockerFile.getInstructions();
    const exposes = insts.filter(i => i.getKeyword() === Keyword.EXPOSE);
    const ports = exposes.map(e => {
        const port = e.getArgumentsContent();
        const index = port.indexOf('/');
        return index > 0 ? +port.substr(0, index) : +port;
    });
    return ports;
}

async function readFileContent(dockerfilePath: string): Promise<string> {
    if (dockerfilePath && await fse.pathExists(dockerfilePath)) {
        return (await fse.readFile(dockerfilePath)).toString();
    }
    throw new Error(localize('vscode-docker-utils.dockerfileUtils.invalidDockerfile', 'The dockerfile "{0}" was not provided or does not exist', dockerfilePath));
}
