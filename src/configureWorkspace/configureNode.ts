/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { WorkspaceFolder } from 'vscode';
import { IActionContext } from 'vscode-azureextensionui';
import { DockerDebugScaffoldContext } from '../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider } from '../debugging/DockerDebugScaffoldingProvider';
import { PlatformOS } from '../utils/platform';
import { getComposePorts, getExposeStatements, IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configureNode: IPlatformGeneratorInfo = {
    genDockerFile,
    genDockerCompose,
    genDockerComposeDebug,
    defaultPorts: [3000],
    initializeForDebugging,
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd }: Partial<PackageInfo>): string {
    let exposeStatements = getExposeStatements(ports);

    let cmdDirective: string;
    if (Array.isArray(cmd)) {
        cmdDirective = `CMD ${toCMDArray(cmd)}`;
    } else {
        cmdDirective = `CMD ${cmd}`;
    }

    return `FROM node:12.18-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
${exposeStatements}
${cmdDirective}`;
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[]): string {
    return `version: '3.4'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    environment:
      NODE_ENV: production
${getComposePorts(ports)}`;
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: number[], { cmd, main }: Partial<PackageInfo>): string {
    const inspectConfig = '--inspect=0.0.0.0:9229';

    let cmdDirective: string;
    if (main) {
        cmdDirective = `command: ${toCMDArray(['node', inspectConfig, main])}`;
    } else {
        cmdDirective = `## set your startup file here\n    command: ["node", "${inspectConfig}", "index.js"]`;
    }

    return `version: '3.4'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    environment:
      NODE_ENV: development
${getComposePorts(ports, 9229)}
    ${cmdDirective}`;
}

async function initializeForDebugging(context: IActionContext, folder: WorkspaceFolder, platformOS: PlatformOS, dockerfile: string, packageInfo: PackageInfo): Promise<void> {
    const scaffoldContext: DockerDebugScaffoldContext = {
        folder: folder,
        platform: 'node',
        actionContext: context,
        dockerfile: dockerfile,
    }

    await dockerDebugScaffoldingProvider.initializeNodeForDebugging(scaffoldContext);
}

function toCMDArray(cmdArray: string[]): string {
    return `[${cmdArray.map(part => {
        if (part.startsWith('"') && part.endsWith('"')) {
            return part;
        }

        return `"${part}"`;
    }).join(', ')}]`;
}
