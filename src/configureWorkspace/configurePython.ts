/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as path from "path";
import vscode = require('vscode');
import { ext } from "../extensionVariables";
import { TelemetryProperties } from 'vscode-azureextensionui';
import { DockerDebugScaffoldContext } from '../debugging/DebugHelper';
import { dockerDebugScaffoldingProvider, PythonScaffoldingOptions } from '../debugging/DockerDebugScaffoldingProvider';
import { getComposePorts, getExposeStatements } from './configure';
import { ScaffoldFile, ScaffolderContext } from './scaffolding';
import { PythonExtensionHelper } from '../tasks/python/PythonExtensionHelper';
import { ConfigureTelemetryProperties, quickPickGenerateComposeFiles, genCommonDockerIgnoreFile } from './configUtils';
import { getPythonProjectType, PythonDefaultDebugPort, inferPythonArgs, PythonDefaultPorts, PythonProjectType, PythonFileTarget, PythonModuleTarget } from "../utils/pythonUtils";

interface LaunchFilePrompt{
  prompt: string,
  defaultFile: string
};

const defaultLaunchFile: Map<PythonProjectType, LaunchFilePrompt> = new Map<PythonProjectType, LaunchFilePrompt>([
  ["django", { prompt: "Enter the relative path to the application (e.g. manage.py)", defaultFile: "manage.py" }],
  ["flask", { prompt: "Enter the relative path to the application, e.g. 'app.py' or 'app'", defaultFile: "app.py" }],
  ["general", { prompt: "Enter the relative path to the application, e.g. 'app.py' or 'app'", defaultFile: "app.py" }],
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

const pythonWebDockerfile = `# For more information, please refer to https://aka.ms/vscode-docker-python
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

const djangoRequirements = `django
gunicorn`;

const flaskRequirements = `flask
gunicorn`;

function genDockerFile(serviceName: string, target: PythonFileTarget | PythonModuleTarget, projectType: PythonProjectType, ports: number[]): string {
  const exposeStatements = getExposeStatements(ports);
  let command = "";
  let dockerFile = "";

  if (projectType == "general"){
    dockerFile = generalDockerfile;
    if ((target as PythonFileTarget).file){
      command = `CMD ["python", "${(target as PythonFileTarget).file}"]`;
    }
    else{
      command = `CMD ["python", "-m", "${(target as PythonModuleTarget).module}"]`;
    }
  }
  else if (projectType == "django"){
    dockerFile = pythonWebDockerfile;
    command = `CMD ["gunicorn", "--bind", "0.0.0.0:${ports ? ports[0] : PythonDefaultPorts[projectType]}", "${serviceName}.wsgi"]`;
  }
  else if (projectType == "flask"){
    dockerFile = pythonWebDockerfile;
    command = `CMD ["gunicorn", "--bind", "0.0.0.0:${ports ? ports[0] : PythonDefaultPorts[projectType]}", "${serviceName}:app"]`;
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

function genDockerComposeDebug(serviceName: string, projectType: PythonProjectType, ports: number[], target: PythonFileTarget | PythonModuleTarget): string {
  const defaultDebugOptions : PythonExtensionHelper.DebugLaunchOptions =
  {
    host: "0.0.0.0",
    port: PythonDefaultDebugPort,
    wait: true
  };

  const args = inferPythonArgs(projectType, ports);
  const launcherCommand = PythonExtensionHelper.getRemotePtvsdCommand(target, args, defaultDebugOptions);
  const entrypoint = "python ".concat(launcherCommand);

  return dockerComposeDebugfile
         .replace(/\$service_name\$/g, serviceName)
         .replace(/\$entrypoint\$/g, entrypoint)
         .replace(/\$ports\$/g, getComposePorts(ports, PythonDefaultDebugPort));
}

function genRequirementsFile(projectType: PythonProjectType): string {
  let contents = '# Add requirements when needed'

  switch (projectType) {
    case "django":
      contents = djangoRequirements;
      break;

    case "flask":
      contents = flaskRequirements
      break;

    default:
      break;
  }

  return contents;
}

async function initializeForDebugging(context: ScaffolderContext, dockerfile: string, ports: number[], generateComposeFiles: boolean,
                                      target: PythonFileTarget | PythonModuleTarget, projectType: PythonProjectType): Promise<void> {
  const scaffoldContext: DockerDebugScaffoldContext = {
      folder: context.folder,
      platform: "python",
      actionContext: context,
      dockerfile: dockerfile,
      generateComposeTask: generateComposeFiles,
      ports: ports
  }

  const pyOptions: PythonScaffoldingOptions = {
      target: target,
      projectType: projectType
  }

  await dockerDebugScaffoldingProvider.initializePythonForDebugging(scaffoldContext, pyOptions);
}

export async function promptForLaunchFile(projectType?: PythonProjectType) : Promise<PythonFileTarget | PythonModuleTarget>{
  const launchFilePrompt = defaultLaunchFile.get(projectType);

  let opt: vscode.InputBoxOptions = {
    placeHolder: launchFilePrompt.defaultFile,
    prompt: launchFilePrompt.prompt,
    value: launchFilePrompt.defaultFile,
    validateInput: (value: string): string | undefined => { return value && value.trim().length > 0 ? undefined : "Enter a valid Python file path." }
  };

  const file = await ext.ui.showInputBox(opt);

  // If the input has the .py extension, then assume it is a file.
  // TODO: is there a more robust way to check?
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
  const projectType = getPythonProjectType(context.platform);

  const defaultPort = PythonDefaultPorts.get(projectType);
  let ports = [];

  if (defaultPort){
    ports = await context.promptForPorts([ defaultPort ]);
  }

  const launchFile = await context.captureStep("pythonFile", promptForLaunchFile)(projectType);

  const dockerFileContents = genDockerFile(serviceName, launchFile, projectType, ports);

  const files: ScaffoldFile[] = [
    { fileName: 'Dockerfile', contents: dockerFileContents, open: true },
    { fileName: '.dockerignore', contents: genCommonDockerIgnoreFile(context.platform) },
    { fileName: 'requirements.txt', contents: genRequirementsFile(projectType) }
  ];

  if (generateComposeFiles){
    properties.orchestration = 'docker-compose';

    const dockerComposeFile = genDockerCompose(serviceName, ports);
    const dockerComposeDebugFile = genDockerComposeDebug(serviceName, projectType, ports, launchFile);

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
    await initializeForDebugging(context, path.join(outputFolder, "Dockerfile"), ports, generateComposeFiles, launchFile, projectType);
  }

  return files;
}
