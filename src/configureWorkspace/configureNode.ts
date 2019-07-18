/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { getComposePorts, getExposeStatements, IPlatformGeneratorInfo, PackageInfo } from './configure';

export let configureNode: IPlatformGeneratorInfo = {
  genDockerFile,
  genDockerCompose,
  genDockerComposeDebug,
  defaultPorts: [3000]
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: Number[], { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
  let exposeStatements = getExposeStatements(ports);

  return `FROM node:10.13-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
${exposeStatements}
CMD ${cmd}`;
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: Number[]): string {
  return `version: '2.1'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    environment:
      NODE_ENV: production
${getComposePorts(ports)}`;
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: string, os: string | undefined, ports: Number[], { fullCommand: cmd }: Partial<PackageInfo>): string {

  const cmdArray: string[] = cmd.split(' ');
  if (cmdArray[0].toLowerCase() === 'node') {
    cmdArray.splice(1, 0, '--inspect=0.0.0.0:9229');
    cmd = `command: ${cmdArray.join(' ')}`;
  } else {
    cmd = '## set your startup file here\n    command: node --inspect index.js';
  }

  return `version: '2.1'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    environment:
      NODE_ENV: development
${getComposePorts(ports.concat(9229))}
    ${cmd}`;
}
