/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PackageInfo } from './configure';

export let configureRuby = {
  genDockerFile,
  genDockerCompose,
  genDockerComposeDebug
};

function genDockerFile(serviceNameAndRelativePath: string, platform: string, os: string | undefined, port: string, { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
  return `FROM ruby:2.5-slim

LABEL Name=${serviceNameAndRelativePath} Version=${version}
EXPOSE ${port}

# throw errors if Gemfile has been modified since Gemfile.lock
RUN bundle config --global frozen 1

WORKDIR /app
COPY . /app

COPY Gemfile Gemfile.lock ./
RUN bundle install

CMD ["ruby", "${serviceNameAndRelativePath}.rb"]
    `;
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: string, os: string | undefined, port: string): string {
  return `version: '2.1'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build: .
    ports:
      - ${port}:${port}`;
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: string, os: string | undefined, port: string, { fullCommand: cmd }: Partial<PackageInfo>): string {
  return `version: '2.1'

services:
  ${serviceNameAndRelativePath}:
    image: ${serviceNameAndRelativePath}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
        - ${port}:${port}
`;
}
