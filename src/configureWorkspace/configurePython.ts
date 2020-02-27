/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as fse from 'fs-extra';
import * as path from "path";
import vscode = require('vscode');
import { TelemetryProperties } from 'vscode-azureextensionui';
import { DockerDebugScaffoldContext } from '../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider, PythonScaffoldingOptions } from '../debugging/DockerDebugScaffoldingProvider';
import { ext } from "../extensionVariables";
import { getPythonProjectType, PythonDefaultPorts, PythonFileExtension, PythonFileTarget, PythonModuleTarget, PythonProjectType, PythonTarget } from "../utils/pythonUtils";
import { getComposePorts, getExposeStatements } from './configure';
import { ConfigureTelemetryProperties, genCommonDockerIgnoreFile, quickPickGenerateComposeFiles } from './configUtils';
import { ScaffolderContext, ScaffoldFile } from './scaffolding';

interface LaunchFilePrompt {
    prompt: string,
    defaultFile: string
}

const defaultLaunchFile: Map<PythonProjectType, LaunchFilePrompt> = new Map<PythonProjectType, LaunchFilePrompt>([
    ['django', { prompt: 'Enter the relative path to the app’s entry point (e.g. manage.py or subfolder_name/manage.py)', defaultFile: 'manage.py' }],
    ['flask', { prompt: 'Enter the relative path to the app’s entry point (e.g. app.py or subfolder_name/app.py)', defaultFile: 'app.py' }],
    ['general', { prompt: 'Enter the relative path to the app’s entry point (e.g. app.py or subfolder_name/app.py)', defaultFile: 'app.py' }],
]);

const pythonDockerfile = `# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python:3.8

$expose_statements$

# Keeps Python from generating .pyc files in the container
ENV PYTHONDONTWRITEBYTECODE 1

# Turns off buffering for easier container logging
ENV PYTHONUNBUFFERED 1

# Install pip requirements
ADD requirements.txt .
RUN python -m pip install -r requirements.txt

WORKDIR /app
ADD . /app

$cmd$
`;

const dockerComposefile = `version: '3.4'

services:
  $service_name$:
    image: $service_name$
    build:
      context: .
      dockerfile: Dockerfile
$ports$`;

const djangoRequirements = `django==3.0.3
gunicorn==20.0.4`;

const flaskRequirements = `flask==1.1.1
gunicorn==20.0.4`;

async function genDockerFile(serviceName: string, target: PythonTarget, projectType: PythonProjectType, ports: number[], outputFolder: string): Promise<string> {
    const exposeStatements = getExposeStatements(ports);
    let command = '';

    if (projectType === 'general') {
        if ((target as PythonFileTarget).file) {
            command = `CMD ["python", "${(target as PythonFileTarget).file}"]`;
        } else {
            command = `CMD ["python", "-m", "${(target as PythonModuleTarget).module}"]`;
        }
    } else if (projectType === 'django') {
        command = await inferDjangoCommand(ports, serviceName, outputFolder);
    } else if (projectType === 'flask') {
        // For Flask apps, our guess is to assume there is a callable "app" object in the file/module that the user provided.
        command = `CMD ["gunicorn", "--bind", "0.0.0.0:${ports ? ports[0] : PythonDefaultPorts[projectType]}", "${inferPythonWsgiModule(target)}:app"]`;
    } else {
        // Unlikely
        throw new Error(`Unknown project type: ${projectType}`);
    }

    return pythonDockerfile
        .replace(/\$expose_statements\$/g, exposeStatements)
        .replace(/\$cmd\$/g, command);
}

function genDockerCompose(serviceName: string, ports: number[]): string {
    return dockerComposefile
        .replace(/\$service_name\$/g, serviceName)
        .replace(/\$ports\$/g, getComposePorts(ports));
}

function genRequirementsFile(projectType: PythonProjectType): string {
    let contents = '# To ensure app dependencies are ported from your virtual environment/host machine into your container, run \'pip freeze > requirements.txt\' in the terminal to overwrite this file';

    switch (projectType) {
        case 'django':
            contents = contents.concat('\n', djangoRequirements);
            break;
        case 'flask':
            contents = contents.concat('\n', flaskRequirements);
            break;
        default:
    }

    return contents;
}

async function initializeForDebugging(context: ScaffolderContext, dockerfile: string, ports: number[],
                                      target: PythonTarget, projectType: PythonProjectType): Promise<void> {
    const scaffoldContext: DockerDebugScaffoldContext = {
        folder: context.folder,
        platform: 'python',
        actionContext: context,
        dockerfile: dockerfile,
        ports: ports
    }

    const pyOptions: PythonScaffoldingOptions = {
        projectType: projectType,
        target: target
    }

    await dockerDebugScaffoldingProvider.initializePythonForDebugging(scaffoldContext, pyOptions);
}

function inferPythonWsgiModule(target: PythonTarget): string {
    let wsgiModule: string;

    if ('module' in target) {
        wsgiModule = target.module;
    } else if ('file' in target) {
        // Get rid of the file extension.
        wsgiModule = target.file.replace(/\.[^/.]+$/, '');
    }

    // Replace forward-slashes with dots.
    return wsgiModule.replace(/\//g, '.');
}

async function inferDjangoCommand(ports: number[], serviceName: string, outputFolder: string) : Promise<string> {
    // For Django apps, there **usually** exists a "wsgi" module in a sub-folder named the same as the project folder.
    // So we check if that path exists, then use it. Else, we output the comment below instructing the user to enter
    // the correct python path to the wsgi module.

    const wsgiPath = path.join(outputFolder, path.join(serviceName, "wsgi.py"));
    const command = `CMD ["gunicorn", "--bind", "0.0.0.0:${ports ? ports[0] : PythonDefaultPorts.get('django')}", "$wsgi_path$"]`;

    if (await fse.pathExists(wsgiPath)) {
        return command.replace(/\$wsgi_path\$/g, `${serviceName}.wsgi`);
    } else {
        return `# File wsgi.py was not found in subfolder:${serviceName}. Please enter the Python path to wsgi file.`
            .concat('\n', command.replace(/\$wsgi_path\$/g, 'pythonPath.to.wsgi'));
    }
}

export async function promptForLaunchFile(projectType?: PythonProjectType) : Promise<PythonTarget> {
    const launchFilePrompt = defaultLaunchFile.get(projectType);

    const opt: vscode.InputBoxOptions = {
        placeHolder: launchFilePrompt.defaultFile,
        prompt: launchFilePrompt.prompt,
        value: launchFilePrompt.defaultFile,
        validateInput: (value: string): string | undefined => { return value && value.trim().length > 0 ? undefined : 'Enter a valid Python file path/module.' }
    };

    // Ensure to change any \ to /.
    const file = (await ext.ui.showInputBox(opt)).replace(/\\/g, '/');

    // If the input has the .py extension or a forward-slash, then treat it as a file/directory (i.e. execute without the -m flag).
    if (path.extname(file).toLocaleUpperCase() === PythonFileExtension.toLocaleUpperCase() ||
        file.indexOf('/') > 0) {
        return { file: file };
    } else {
        return { module: file};
    }
}

export async function scaffoldPython(context: ScaffolderContext): Promise<ScaffoldFile[]> {
    const properties: TelemetryProperties & ConfigureTelemetryProperties = context.telemetry.properties;
    const serviceName = context.folder.name;
    const rootFolderPath: string = context.rootFolder;
    const outputFolder = context.outputFolder ?? rootFolderPath;

    const generateComposeFiles = await context.captureStep('compose', quickPickGenerateComposeFiles)();
    const projectType = getPythonProjectType(context.platform);
    const launchFile = await context.captureStep('pythonFile', promptForLaunchFile)(projectType);

    const defaultPort = PythonDefaultPorts.get(projectType);
    let ports = [];

    if (defaultPort) {
        ports = await context.promptForPorts([ defaultPort ]);
    }

    const dockerFileContents = await genDockerFile(serviceName, launchFile, projectType, ports, outputFolder);
    const dockerIgnoreContents = '**/__pycache__\n'.concat(genCommonDockerIgnoreFile(context.platform));

    const files: ScaffoldFile[] = [
        { fileName: 'Dockerfile', contents: dockerFileContents, open: true },
        { fileName: '.dockerignore', contents: dockerIgnoreContents }
    ];

    const requirementsFileExists = await fse.pathExists(path.join(outputFolder, 'requirements.txt'));

    if (!requirementsFileExists) {
        files.push({ fileName: 'requirements.txt', contents: genRequirementsFile(projectType) });
    }

    if (generateComposeFiles) {
        properties.orchestration = 'docker-compose';

        const dockerComposeFile = genDockerCompose(serviceName, ports);

        files.push({ fileName: 'docker-compose.yml', contents: dockerComposeFile });
    }

    files.forEach(file => {
    // Remove multiple empty lines with single empty lines, as might be produced
    // if $expose_statements$ or another template variable is an empty string.
        file.contents = file.contents
            .replace(/(\r\n){3,4}/g, '\r\n\r\n')
            .replace(/(\n){3,4}/g, '\n\n');
    });

    if (context.initializeForDebugging) {
        await initializeForDebugging(context, path.join(outputFolder, 'Dockerfile'), ports, launchFile, projectType);
    }

    return files;
}
