/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PackageInfo } from './configure';

export let configureNode = {
  genDockerFile,
  genDockerCompose,
  genDockerComposeDebug
};

// Note: serviceName includes the path of the service relative to the generated file, e.g. 'projectFolder1/myAspNetService'
function genDockerFile(serviceName: string, platform: string, os: string | undefined, port: string, { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
  return `FROM node:8.9-alpine
ENV NODE_ENV production
WORKDIR /usr/src/app
COPY ["package.json", "package-lock.json*", "npm-shrinkwrap.json*", "./"]
RUN npm install --production --silent && mv node_modules ../
COPY . .
EXPOSE ${port}
CMD ${cmd}`;
}

function genDockerCompose(serviceName: string, platform: string, os: string | undefined, port: string): string {
  return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    environment:
      NODE_ENV: production
    ports:
      - ${port}:${port}`;
}

function genDockerComposeDebug(serviceName: string, platform: string, os: string | undefined, port: string, { fullCommand: cmd }: Partial<PackageInfo>): string {

  const cmdArray: string[] = cmd.split(' ');
  if (cmdArray[0].toLowerCase() === 'node') {
    cmdArray.splice(1, 0, '--inspect=0.0.0.0:9229');
    cmd = `command: ${cmdArray.join(' ')}`;
  } else {
    cmd = '## set your startup file here\n    command: node --inspect index.js';
  }

  return `version: '2.1'

services:
${serviceName}:
image: ${serviceName}
build: .
environment:
NODE_ENV: development
ports:
- ${port}:${port}
- 9229:9229
${cmd}`;
}
