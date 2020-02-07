/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import vscode = require('vscode');
import { ext } from "../extensionVariables";
import { TelemetryProperties } from 'vscode-azureextensionui';
import { DockerDebugScaffoldContext } from '../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider } from '../debugging/DockerDebugScaffoldingProvider';
import { PythonScaffoldingOptions, PythonFileTarget, PythonModuleTarget } from '../debugging/python/PythonDebugHelper';
import { Platform } from '../utils/platform';
import { getComposePorts, getExposeStatements } from './configure';
import { ScaffoldFile, ScaffolderContext } from './scaffolding';
import { PythonExtensionHelper } from '../tasks/python/PythonExtensionHelper';
import { ConfigureTelemetryProperties, quickPickGenerateComposeFiles, genCommonDockerIgnoreFile } from './configUtils';
import { getPythonProjectType } from "../utils/pythonUtils";

interface LaunchFilePrompt{
  prompt: string,
  defaultFile: string
};

const defaultPorts: Map<Platform, number> = new Map<Platform, number>([
  ["Python: Django", 8000],
  ["Python: Flask", 5000],
]);

const defaultLaunchFile: Map<Platform, LaunchFilePrompt> = new Map<Platform, LaunchFilePrompt>([
  ["Python: Django", { prompt: "Enter the relative path to the application (e.g. manage.py)", defaultFile: "manage.py" }],
  ["Python: Flask", { prompt: "Enter the relative path to the application, e.g. 'app.py' or 'app'", defaultFile: "app.py" }],
  ["Python: General", { prompt: "Enter the relative path to the application, e.g. 'app.py' or 'app'", defaultFile: "app.py" }],
]);

const generalDockerfile = `# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python

$expose_statements$

# Install pip requirements
ADD requirements.txt .
RUN python3 -m pip install -r requirements.txt

WORKDIR /app
ADD . /app

$cmd$
`;

const uwsgiDockerfile = `# For more information, please refer to https://aka.ms/vscode-docker-python
FROM python

$expose_statements$

# Install pip requirements
ADD requirements.txt .
RUN python3 -m pip install -r requirements.txt

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

const dockerComposeDebugfile = `version: '3.4'

services:
  $service_name$:
    image: $service_name$
    build:
      context: .
      dockerfile: Dockerfile
    volumes:
      - ${PythonExtensionHelper.getLauncherFolderPath()}:/pydbg
    entrypoint: $entrypoint$
$ports$`;

const djangoRequirements = `Django
gunicorn`;

const flaskRequirements = `Flask
gunicorn`;

function genDockerFile(serviceName: string, target: PythonFileTarget | PythonModuleTarget, platform: Platform, ports: number[]): string {
  const exposeStatements = getExposeStatements(ports);
  let command = "";
  let dockerFile = "";

  if (platform == "Python: General"){
    dockerFile = generalDockerfile;
    if ((target as PythonFileTarget).file){
      command = `CMD ["python", "${(target as PythonFileTarget).file}"]`;
    }
    else{
      command = `CMD ["python", "-m", "${(target as PythonModuleTarget).module}"]`;
    }
  }
  else if (platform == "Python: Django"){
    dockerFile = uwsgiDockerfile;
    command = `CMD ["gunicorn", "--bind", "0.0.0.0:${ports !== undefined ? ports[0] : 0}", "${serviceName}.wsgi"]`;
  }
  else if (platform == "Python: Flask"){
    dockerFile = uwsgiDockerfile;
    command = `CMD ["gunicorn", "--bind", "0.0.0.0:${ports !== undefined ? ports[0] : 0}", "${serviceName}:app"]`;
  }

  return dockerFile
        .replace(/\$expose_statements\$/g, exposeStatements)
        .replace(/\$cmd\$/g, command);
}

function genDockerCompose(serviceName: string, ports: number[]): string {
  return dockerComposefile
        .replace(/\$service_name\$/g, serviceName)
        .replace(/\$ports\$/g, getComposePorts(ports));
}

function genDockerComposeDebug(serviceName: string, platform: Platform, ports: number[], target: PythonFileTarget | PythonModuleTarget): string {
  const defaultDebugPort = 5678;
  const defaultDebugOptions : PythonExtensionHelper.DebugLaunchOptions =
  {
    host: "0.0.0.0",
    port: defaultDebugPort,
    wait: true
  };

  let args = [];
  switch (platform) {
    case "Python: Django":
      args = [
        "runserver",
        `0.0.0.0:${ports ? ports[0] : 8000}`,
        "--nothreading",
        "--noreload"
      ];
      break;
    default:
      break;
  }

  const launcherCommand = PythonExtensionHelper.getRemoteLauncherCommand(target, args, defaultDebugOptions);
  const entrypoint = "python ".concat(launcherCommand);

  return dockerComposeDebugfile
         .replace(/\$service_name\$/g, serviceName)
         .replace(/\$entrypoint\$/g, entrypoint)
         .replace(/\$ports\$/g, getComposePorts(ports, defaultDebugPort));
}

function genRequirementsFile(platform: Platform): string {
  let contents = '# Add requirements when needed'

  switch (platform) {
    case "Python: Django":
      contents = djangoRequirements;
      break;

    case "Python: Flask":
      contents = flaskRequirements
      break;

    default:
      break;
  }

  return contents;
}

async function initializeForDebugging(context: ScaffolderContext, dockerfile: string, ports: number[], generateComposeFiles: boolean,
                                      target: PythonFileTarget | PythonModuleTarget): Promise<void> {
  const scaffoldContext: DockerDebugScaffoldContext = {
      folder: context.folder,
      platform: "python",
      actionContext: context,
      dockerfile: dockerfile,
      generateComposeTask: generateComposeFiles
  }

  const pyOptions: PythonScaffoldingOptions = {
      target: target,
      projectType: getPythonProjectType(context.platform)
  }

  await dockerDebugScaffoldingProvider.initializePythonForDebugging(scaffoldContext, pyOptions);
}

export async function promptForLaunchFile(platform?: Platform) : Promise<PythonFileTarget | PythonModuleTarget>{
  const launchFilePrompt = defaultLaunchFile.get(platform);

  let opt: vscode.InputBoxOptions = {
    placeHolder: launchFilePrompt.defaultFile,
    prompt: launchFilePrompt.prompt,
    value: launchFilePrompt.defaultFile,
    validateInput: (value: string): string | undefined => { return value && value.trim().length > 0 ? undefined : "Enter a valid Python file path." }
  };

  const file = await ext.ui.showInputBox(opt);

  if (file.toLowerCase().endsWith(".py")){
    return { file: file.replace(/\\/g, '/') };
  }
  else{
    return { module: file};
  }
}

export async function scaffoldPython(context: ScaffolderContext): Promise<ScaffoldFile[]> {
  const properties: TelemetryProperties & ConfigureTelemetryProperties = context.telemetry.properties;
  const serviceName = context.folder.name;
  const rootFolderPath: string = context.rootFolder;
  const outputFolder = context.outputFolder ?? rootFolderPath;

  const generateComposeFiles = await context.captureStep("compose", quickPickGenerateComposeFiles)();

  const defaultPort = defaultPorts.get(context.platform);
  let ports = [];

  if (defaultPort){
    ports = await context.promptForPorts([ defaultPort ]);
  }

  const launchFile = await context.captureStep("pythonFile", promptForLaunchFile)(context.platform);

  let dockerFileContents = genDockerFile(serviceName, launchFile, context.platform, ports);

  let files: ScaffoldFile[] = [
    { fileName: 'Dockerfile', contents: dockerFileContents, open: true },
    { fileName: '.dockerignore', contents: genCommonDockerIgnoreFile(context.platform) },
    { fileName: 'requirements.txt', contents: genRequirementsFile(context.platform) }
  ];

  if (generateComposeFiles){
    properties.orchestration = 'docker-compose';

    const dockerComposeFile = genDockerCompose(serviceName, ports);
    const dockerComposeDebugFile = genDockerComposeDebug(serviceName, context.platform, ports, launchFile);

    files.push(
      { fileName: 'docker-compose.yml', contents: dockerComposeFile },
      { fileName: 'docker-compose.debug.yml', contents: dockerComposeDebugFile });
  }

  files.forEach(file => {
    // Remove multiple empty lines with single empty lines, as might be produced
    // if $expose_statements$ or another template variable is an empty string
    file.contents = file.contents
      .replace(/(\r\n){3,4}/g, "\r\n\r\n")
      .replace(/(\n){3,4}/g, "\n\n");
  });

  if (context.initializeForDebugging){
    await initializeForDebugging(context, path.join(outputFolder, "Dockerfile"), ports, generateComposeFiles, launchFile);
  }

  return files;
}
