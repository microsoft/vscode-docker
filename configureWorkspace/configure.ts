import vscode = require('vscode');
import * as path from 'path';
import * as fs from 'fs';

const dockerFileTemplate: string = [
    'FROM node:latest',
    'RUN mkdir -p /src',
    'WORKDIR /src',
    'COPY package.json',
    'RUN npm install --production',
    'COPY . /src',
    'EXPOSE 3000',
    'CMD ["npm", "start"]'
].join(process.platform === 'win32' ? '\r\n' : '\n');

const dockerComposeTemplate: string  = [
    'version: \'2\'',
    '',
    'services:',
    '  expressstarter:',
    '    image: expressstarter',
    '    build:',
    '      context: .',
    '      dockerfile: dockerfile',
    '    ports:',
    '      - 3000:3000'
].join(process.platform === 'win32' ? '\r\n' : '\n');

const dockerComposeDebugTemplate: string  = [
    'version: \'2\'',
    '',
    'services:',
    '  expressstarter:',
    '    image: expressstarter',
    '    build:',
    '      context: .',
    '      dockerfile: dockerfile',
    '    ports:',
    '      - 3000:3000',
    '      - 5858:5858',
    '    volumes:',
    '      - .:/src',
    '    command:',
    '      - node --debug=5858 server.js'
].join(process.platform === 'win32' ? '\r\n' : '\n');

export function configure(): void {

    if (!vscode.workspace.rootPath) {
        vscode.window.showErrorMessage('Docker files can only be generated if VS Code is opened on a folder.');
        return;
    }

    let dockerFile = path.join(vscode.workspace.rootPath, 'dockerfile');
    let dockerComposeFile = path.join(vscode.workspace.rootPath, 'docker-copose.yml');
    let dockerComposeDebugFile = path.join(vscode.workspace.rootPath, 'docker-compose.debug.yml');

    if (fs.existsSync(dockerFile)) {
        vscode.window.showInformationMessage('A dockerfile already exists.');
    } else {
        fs.writeFileSync(dockerFile, dockerFileTemplate, { encoding: 'utf8' });
    }

    if (fs.existsSync(dockerComposeFile)) {
        vscode.window.showInformationMessage('A docker-compose.yml file already exists.');
    } else {
        fs.writeFileSync(dockerComposeFile, dockerComposeTemplate, { encoding: 'utf8' });
    }

    if (fs.existsSync(dockerComposeDebugFile)) {
        vscode.window.showInformationMessage('A docker-compose.debug.yml file already exists.');
    } else {
        fs.writeFileSync(dockerComposeDebugFile, dockerComposeDebugTemplate, { encoding: 'utf8' });
    }

    // update launch.json

}