import vscode = require('vscode');
import * as path from 'path';
import * as fs from 'fs';
import { promptForPort, quickPickPlatform } from './config-utils';
import { reporter } from '../telemetry/telemetry';
const teleCmdId: string = 'vscode-docker.configure';

const yesNoPrompt: vscode.MessageItem[] =
    [{
        "title": 'Yes',
        "isCloseAffordance": false
    },
    {
        "title": 'No',
        "isCloseAffordance": true
    }];

function genDockerFile(serviceName: string, imageName: string, platform: string, port: string, cmd: string, author: string, version: string): string {

    switch (platform.toLowerCase()) {
        case 'node.js':

            return `FROM node:6-alpine
+LABEL Name=${serviceName} Version=${version}
+WORKDIR /usr/src/app 
+COPY package.json package.json
+RUN npm install --only=prod
+COPY . .
 EXPOSE ${port}
-CMD ${cmd}`;

        case 'go':

            return `
# golang:onbuild automatically copies the package source, 
# fetches the application dependencies, builds the program, 
# and configures it to run on startup 
FROM golang:onbuild
LABEL Name=${serviceName} Version=${version} 
EXPOSE ${port}

# For more control, you can copy and build manually
# FROM golang:latest 
# LABEL Name=${serviceName} Version=${version} 
# RUN mkdir /app 
# ADD . /app/ 
# WORKDIR /app 
# RUN go build -o main .
# EXPOSE ${port} 
# CMD ["/app/main"]
`;

        case '.net core':

            return `
FROM microsoft/aspnetcore:1
LABEL Name=${serviceName} Version=${version} 
ARG source=.
WORKDIR /app
EXPOSE ${port}
COPY $source .
ENTRYPOINT dotnet ${serviceName}.dll
`;

        default:

            return `
FROM docker/whalesay:latest
LABEL Name=${serviceName} Version=${version} 
RUN apt-get -y update && apt-get install -y fortunes
CMD /usr/games/fortune -a | cowsay
`;
    }

}

function genDockerCompose(serviceName: string, imageName: string, platform: string, port: string): string {

    switch (platform.toLowerCase()) {
        case 'node.js':
            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: production
    ports:
      - ${port}:${port}`;

        case 'go':
            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - ${port}:${port}`;

        case '.net core':
            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - ${port}:${port}`;

        default:
            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
      - ${port}:${port}`;
    }
}

function genDockerComposeDebug(serviceName: string, imageName: string, platform: string, port: string, cmd: string): string {

    switch (platform.toLowerCase()) {
        case 'node.js':

            var cmdArray: string[] = cmd.split(' ');
            if (cmdArray[0].toLowerCase() === 'node') {
                cmdArray.splice(1, 0, '--debug=5858');
                cmd = 'command: ' + cmdArray.join(' ');
            } else {
                cmd = '## set your startup file here\n    command: node --debug=5858 app.js';
            }

            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
    environment:
      NODE_ENV: development
    ports:
      - ${port}:${port}
      - 5858:5858
    volumes:
      - .:/usr/src/app
    ${cmd}
`;

        case 'go':
            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
    ports:
        - ${port}:${port}
`;
        case '.net core':
            return `
version: '2'

services:
  ${serviceName}:
    build:
      args:
        source: obj/Docker/empty/
    labels:
      - "com.microsoft.visualstudio.targetoperatingsystem=linux"
    environment:
      - ASPNETCORE_ENVIRONMENT=Development
      - DOTNET_USE_POLLING_FILE_WATCHER=1
    volumes:
      - .:/app
      - ~/.nuget/packages:/root/.nuget/packages:ro
      - ~/clrdbg:/clrdbg:ro
    entrypoint: tail -f /dev/null
`;

        default:
            return `
version: \'2\'

services:
  ${serviceName}:
    image: ${imageName}
    build:
      context: .
      dockerfile: Dockerfile
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
            "remoteRoot": "/usr/src/app"
        }
    ]
}`;

interface PackageJson {
    npmStart: boolean, //has npm start
    cmd: string,
    fullCommand: string, //full command
    author: string,
    version: string
}

function hasWorkspaceFolder(): boolean {
    return vscode.workspace.rootPath ? true : false;
}

function getPackageJson(): Thenable<vscode.Uri[]> {
    if (!hasWorkspaceFolder()) {
        return Promise.resolve(null);
    }

    return Promise.resolve(vscode.workspace.findFiles('package.json', null, 1, null));
}

function readPackageJson(): Thenable<PackageJson> {
    // open package.json and look for main, scripts start
    return getPackageJson().then(function (uris: vscode.Uri[]) {
        var pkg: PackageJson = {
            npmStart: true,
            fullCommand: 'npm start',
            cmd: 'npm start',
            author: 'author',
            version: '0.0.1'
        }; //default

        if (uris && uris.length > 0) {
            var json = JSON.parse(fs.readFileSync(uris[0].fsPath, 'utf8'));

            if (json.scripts && json.scripts.start) {
                pkg.npmStart = true;
                pkg.fullCommand = json.scripts.start;
                pkg.cmd = 'npm start';
            } else if (json.main) {
                pkg.npmStart = false;
                pkg.fullCommand = 'node' + ' ' + json.main;
                pkg.cmd = pkg.fullCommand;
            } else {
                pkg.fullCommand = '';
            }

            if (json.author) {
                pkg.author = json.author;
            }

            if (json.version) {
                pkg.version = json.version;
            }
        }

        return Promise.resolve(pkg);

    });
}

export function configure(): void {


    if (!hasWorkspaceFolder()) {
        vscode.window.showErrorMessage('Docker files can only be generated if VS Code is opened on a folder.');
        return;
    }

    let dockerFile = path.join(vscode.workspace.rootPath, 'Dockerfile');
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
            var serviceName: string;

            readPackageJson().then((pkg: PackageJson) => {

                if (process.platform === 'win32') {
                    serviceName = vscode.workspace.rootPath.split('\\').pop().toLowerCase();
                } else {
                    serviceName = vscode.workspace.rootPath.split('/').pop().toLowerCase();
                }

                var imageName: string = serviceName + ':latest';

                if (fs.existsSync(dockerFile)) {
                    vscode.window.showErrorMessage('A Dockerfile already exists. Overwrite?', ...yesNoPrompt).then((item: vscode.MessageItem) => {
                        if (item.title.toLowerCase() === 'yes') {
                            fs.writeFileSync(dockerFile, genDockerFile(serviceName, imageName, platformType, portNum, pkg.cmd, pkg.author, pkg.version), { encoding: 'utf8' });
                        }
                    });
                } else {
                    fs.writeFileSync(dockerFile, genDockerFile(serviceName, imageName, platformType, portNum, pkg.cmd, pkg.author, pkg.version), { encoding: 'utf8' });
                }

                if (fs.existsSync(dockerComposeFile)) {
                    vscode.window.showErrorMessage('A docker-compose.yml already exists. Overwrite?', ...yesNoPrompt).then((item: vscode.MessageItem) => {
                        if (item.title.toLowerCase() === 'yes') {
                            fs.writeFileSync(dockerComposeFile, genDockerCompose(serviceName, imageName, platformType, portNum), { encoding: 'utf8' });
                        }
                    });
                } else {
                    fs.writeFileSync(dockerComposeFile, genDockerCompose(serviceName, imageName, platformType, portNum), { encoding: 'utf8' });
                }

                if (fs.existsSync(dockerComposeDebugFile)) {
                    vscode.window.showErrorMessage('A docker-compose.debug.yml already exists. Overwrite?', ...yesNoPrompt).then((item: vscode.MessageItem) => {
                        if (item.title.toLowerCase() === 'yes') {
                            fs.writeFileSync(dockerComposeDebugFile, genDockerComposeDebug(serviceName, imageName, platformType, portNum, pkg.fullCommand), { encoding: 'utf8' });
                        }
                    });
                } else {
                    fs.writeFileSync(dockerComposeDebugFile, genDockerComposeDebug(serviceName, imageName, platformType, portNum, pkg.fullCommand), { encoding: 'utf8' });
                }

                if (reporter) {
                    reporter.sendTelemetryEvent('command', {
                        command: teleCmdId,
                        platformType: platformType
                    });
                }

            });

        });
    });

}

export function configureLaunchJson(): string {
    // contribute a launch.json configuration
    return launchJsonTemplate;
}
