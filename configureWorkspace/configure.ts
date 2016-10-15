import vscode = require('vscode');
import * as path from 'path';
import * as fs from 'fs';
import { promptForPort, quickPickPlatform } from './config-utils';

function genDockerFile(platform: string, port: string): string {

    switch (platform.toLowerCase()) {
        case 'nodejs':

            return `
FROM node:latest
RUN mkdir -p /src
WORKDIR /src
COPY package.json /src
RUN npm install --production
COPY . /src
EXPOSE ${port}
CMD ["npm", "start"]
`;

        case 'go':

            return `
# golang:onbuild automatically copies the package source, 
# fetches the application dependencies, builds the program, 
# and configures it to run on startup 
FROM golang:onbuild
EXPOSE ${port}

# For more control, you can copy and build manually
# FROM golang:latest 
# RUN mkdir /app 
# ADD . /app/ 
# WORKDIR /app 
# RUN go build -o main .
# EXPOSE ${port} 
# CMD ["/app/main"]
`;

        case '.net core':

            return `
FROM microsoft/dotnet:1.0.0-core
WORKDIR /app
ENV ASPNETCORE_URLS http://*:${port}
EXPOSE ${port}
ENTRYPOINT ["dotnet", "dn.dll"]
COPY . /app
`;

        default:

            return `
FROM docker/whalesay:latest
RUN apt-get -y update && apt-get install -y fortunes
CMD /usr/games/fortune -a | cowsay
`;
    }

}

function genDockerCompose(serviceName: string, platform: string, port: string): string {

    switch (platform.toLowerCase()) {
        case 'nodejs':
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  environment:
    NODE_ENV: production
  ports:
    - ${port}:${port}`;

        case 'go':
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  ports:
    - ${port}:${port}`;

        case '.net core':
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  ports:
    - ${port}:${port}`;

        default:
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  ports:
    - ${port}:${port}`;
  }
}

function genDockerComposeDebug(serviceName: string, platform: string, port: string): string {

    switch (platform.toLowerCase()) {
        case 'nodejs':
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  environment:
    NODE_ENV: development
  ports:
    - ${port}:${port}
    - 5858:5858
  volumes:
    - .:/src
  command:
    - node --debug=5858 server.js
`;

        case 'go':
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  ports:
      - ${port}:${port}
`;
        case '.net core':
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  ports:
    - ${port}:${port}
`;
        default:
            return `
version: \'2\'

services:
  ${serviceName}:
  image: ${serviceName}
  build:
    context: .
    dockerfile: dockerfile
  ports:
    - ${port}:${port}
`;
    }
}

const launchJsonTemplate: string = 
`{
    "version": "0.2.0",
    "configurations": [
        {
            "name": "Docker: Attach to Node",
            "type": "node",
            "request": "attach",
            "port": 5858,
            "address": "localhost",
            "restart": false,
            "sourceMaps": false,
            "outFiles": [],
            "localRoot": "\${workspaceRoot}",
            "remoteRoot": "/src"
        }
    ]
}`

export function configure(): void {

    if (!vscode.workspace.rootPath) {
        vscode.window.showErrorMessage('Docker files can only be generated if VS Code is opened on a folder.');
        return;
    }

    let dockerFile = path.join(vscode.workspace.rootPath, 'dockerfile');
    let dockerComposeFile = path.join(vscode.workspace.rootPath, 'docker-compose.yml');
    let dockerComposeDebugFile = path.join(vscode.workspace.rootPath, 'docker-compose.debug.yml');


    quickPickPlatform().then((platform: string) => {
        return platform;
    }).then((platform: string) => {

        // user pressed Esc?
        if (!platform) {
            return;
        }

        promptForPort().then((port: string) => {

            // user pressed Esc?
            if (!port) {
                return;
            }
            
            var portNum: string = port || '3000';
            var platformType: string = platform || 'node';
            var serviceName: string = 'webapp';

            if (fs.existsSync(dockerFile)) {
                vscode.window.showInformationMessage('A dockerfile already exists.');
            } else {
                fs.writeFileSync(dockerFile, genDockerFile(platformType, portNum), { encoding: 'utf8' });
            }

            if (fs.existsSync(dockerComposeFile)) {
                vscode.window.showInformationMessage('A docker-compose.yml file already exists.');
            } else {
                fs.writeFileSync(dockerComposeFile, genDockerCompose(serviceName, platformType, portNum), { encoding: 'utf8' });
            }

            if (fs.existsSync(dockerComposeDebugFile)) {
                vscode.window.showInformationMessage('A docker-compose.debug.yml file already exists.');
            } else {
                fs.writeFileSync(dockerComposeDebugFile, genDockerComposeDebug(serviceName, platformType, portNum), { encoding: 'utf8' });
            }

        });
    });

}

export function configureLaunchJson(): string {
    // contribute a launch.json configuration
    return launchJsonTemplate;
}