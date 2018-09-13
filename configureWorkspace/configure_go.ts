/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { PackageInfo } from './configure';

export let configureGo = {
  genDockerFile,
  genDockerCompose,
  genDockerComposeDebug
};

// Note: serviceName includes the path of the service relative to the generated file, e.g. 'projectFolder1/myAspNetService'
function genDockerFile(serviceName: string, platform: string, os: string | undefined, port: string, { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
  return `
#build stage
FROM golang:alpine AS builder
WORKDIR /go/src/app
COPY . .
RUN apk add --no-cache git
RUN go get -d -v ./...
RUN go install -v ./...

#final stage
FROM alpine:latest
RUN apk --no-cache add ca-certificates
COPY --from=builder /go/bin/app /app
ENTRYPOINT ./app
LABEL Name=${serviceName} Version=${version}
EXPOSE ${port}
`;
}

function genDockerCompose(serviceName: string, platform: string, os: string | undefined, port: string): string {
  return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build: .
    ports:
      - ${port}:${port}`;
}

function genDockerComposeDebug(serviceName: string, platform: string, os: string | undefined, port: string, { fullCommand: cmd }: Partial<PackageInfo>): string {
  return `version: '2.1'

services:
  ${serviceName}:
    image: ${serviceName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
        - ${port}:${port}
`;
}
