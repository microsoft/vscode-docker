import vscode = require('vscode');
import * as path from 'path';
import * as fs from 'fs';
import { promptForPort, quickPickPlatform } from './config-utils';

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

            return `
FROM node:latest
MAINTAINER ${author}
LABEL Name=${serviceName} Version=${version} 
COPY package.json /tmp/package.json
RUN cd /tmp && npm install --production
RUN mkdir -p /usr/src/app && mv /tmp/node_modules /usr/src
WORKDIR /usr/src/app
COPY . /usr/src/app
EXPOSE ${port}
CMD ${cmd}
`;

        case 'go':

            return `
# golang:onbuild automatically copies the package source, 
# fetches the application dependencies, builds the program, 
# and configures it to run on startup 
FROM golang:onbuild
MAINTAINER ${author}
LABEL Name=${serviceName} Version=${version} 
EXPOSE ${port}

# For more control, you can copy and build manually
# FROM golang:latest 
# MAINTAINER ${author}
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
FROM microsoft/dotnet:1.1-runtime
MAINTAINER ${author}
LABEL Name=${serviceName} Version=${version} 
ARG source=.
WORKDIR /app
EXPOSE ${port}
ENTRYPOINT dotnet ${serviceName}.dll
COPY $source /app
`;

        default:

            return `
FROM docker/whalesay:latest
MAINTAINER ${author}
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
    image: ${serviceName}:debug
    build:
      context: .
      dockerfile: Dockerfile.debug
    environment:
      - REMOTE_DEBUGGING
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

function genDockerDebug(serviceName: string, platform: string): string {
    switch (platform.toLowerCase()) {
        case 'node.js':
            return ``;
        case 'go':
            return ``;
        case '.net core':
            return `
FROM microsoft/dotnet:1.1-sdk-msbuild
ENV NUGET_XMLDOC_MODE skip
ARG CLRDBG_VERSION=VS2015U2
WORKDIR /clrdbg
RUN apt-get update \
    && apt-get install -y --no-install-recommends \
        unzip \
    && rm -rf /var/lib/apt/lists/*
RUN curl -SL https://raw.githubusercontent.com/Microsoft/MIEngine/getclrdbg-release/scripts/GetClrDbg.sh --output GetClrDbg.sh \
    && chmod 700 GetClrDbg.sh \
    && ./GetClrDbg.sh $CLRDBG_VERSION \
    && rm GetClrDbg.sh
WORKDIR /app
ENTRYPOINT ["/bin/bash", "-c", "if [ -z \"$REMOTE_DEBUGGING\" ]; then dotnet ${serviceName}; else sleep infinity; fi"]
COPY . /app
`;
    }
}

function genDockerPowershell(serviceName: string, platform: string): string {
    switch (platform.toLowerCase()) {
        case 'node.js':
            return ``;
        case 'go':
            return ``;
        case '.net core':
            return `
<#
.SYNOPSIS
Builds and runs a Docker image.
.PARAMETER Compose
Runs docker-compose.
.PARAMETER Build
Builds a Docker image.
.PARAMETER Clean
Removes the image dockerdebugapp and kills all containers based on that image.
.PARAMETER ComposeForDebug
Builds the image and runs docker-compose.
.PARAMETER StartDebugging
Finds the running container and starts the debugger inside of it.
.PARAMETER Environment
The enviorment to build for (Debug or Release), defaults to Debug
.EXAMPLE
C:\PS> .\dockerTask.ps1 -Build
Build a Docker image named dockerdebugapp
#>

Param(
    [Parameter(Mandatory=$True,ParameterSetName="Compose")]
    [switch]$Compose,
    [Parameter(Mandatory=$True,ParameterSetName="ComposeForDebug")]
    [switch]$ComposeForDebug,
    [Parameter(Mandatory=$True,ParameterSetName="StartDebugging")]
    [switch]$StartDebugging,
    [Parameter(Mandatory=$True,ParameterSetName="Build")]
    [switch]$Build,
    [Parameter(Mandatory=$True,ParameterSetName="Clean")]
    [switch]$Clean,
    [parameter(ParameterSetName="Compose")]
    [Parameter(ParameterSetName="ComposeForDebug")]
    [parameter(ParameterSetName="Build")]
    [parameter(ParameterSetName="Clean")]
    [ValidateNotNullOrEmpty()]
    [String]$Environment = "Debug"
)

$imageName="${serviceName}"
$projectName="${serviceName}"
$serviceName="${serviceName}"
$containerName="${serviceName}_${serviceName}_1"
$runtimeID = "debian.8-x64"
$framework = "netcoreapp1.1"

# Kills all running containers of an image and then removes them.
function CleanAll () {
    $composeFileName = "docker-compose.yml"
    if ($Environment -ne "Release") {
        $composeFileName = "docker-compose.$Environment.yml"
    }

    if (Test-Path $composeFileName) {
        docker-compose -f "$composeFileName" -p $projectName down --rmi all

        $danglingImages = $(docker images -q --filter 'dangling=true')
        if (-not [String]::IsNullOrWhiteSpace($danglingImages)) {
            docker rmi -f $danglingImages
        }
    }
    else {
        Write-Error -Message "$Environment is not a valid parameter. File '$composeFileName' does not exist." -Category InvalidArgument
    }
}

# Builds the Docker image.
function BuildImage () {
    $composeFileName = "docker-compose.yml"
    if ($Environment -ne "Release") {
        $composeFileName = "docker-compose.$Environment.yml"
    }

    if (Test-Path $composeFileName) {
        Write-Host "Building the project ($ENVIRONMENT)."
        $pubFolder = "bin\$Environment\$framework\publish"
        dotnet publish -f $framework -r $runtimeID -c $Environment -o $pubFolder

        Write-Host "Building the image $imageName ($Environment)."
        docker-compose -f "$pubFolder\$composeFileName" -p $projectName build
    }
    else {
        Write-Error -Message "$Environment is not a valid parameter. File '$composeFileName' does not exist." -Category InvalidArgument
    }
}

# Runs docker-compose.
function Compose () {
    $composeFileName = "docker-compose.yml"
    if ($Environment -ne "Release") {
        $composeFileName = "docker-compose.$Environment.yml"
    }

    if (Test-Path $composeFileName) {
        Write-Host "Running compose file $composeFileName"
        docker-compose -f $composeFileName -p $projectName kill
        docker-compose -f $composeFileName -p $projectName up -d
    }
    else {
        Write-Error -Message "$Environment is not a valid parameter. File '$dockerFileName' does not exist." -Category InvalidArgument
    }
}

function StartDebugging () {
    $containerId = (docker ps -f "name=$containerName" -q -n=1)
    if ([System.String]::IsNullOrWhiteSpace($containerId)) {
        Write-Error "Could not find a container named $containerName"
    }

    docker exec -i $containerId /clrdbg/clrdbg --interpreter=mi
}

$Environment = $Environment.ToLowerInvariant()

# Call the correct function for the parameter that was used
if($Compose) {
    Compose
}
elseif($ComposeForDebug) {
    $env:REMOTE_DEBUGGING = 1
    BuildImage
    Compose
}
elseif($StartDebugging) {
    StartDebugging
}
elseif($Build) {
    BuildImage
}
elseif ($Clean) {
    CleanAll
}
`;
    }
}

function genDockerBash(serviceName: string, platform: string): string {
    switch (platform.toLowerCase()) {
        case 'node.js':
            return ``;
        case 'go':
            return ``;
        case '.net core':
            return `
imageName="${serviceName}"
projectName="${serviceName}"
serviceName="${serviceName}"
containerName="${serviceName}_${serviceName}_1"
runtimeID="debian.8-x64"
framework="netcoreapp1.1"

# Kills all running containers of an image and then removes them.
cleanAll () {
  if [[ -z $ENVIRONMENT ]]; then
    ENVIRONMENT="debug"
  fi

  composeFileName="docker-compose.yml"
  if [[ $ENVIRONMENT != "release" ]]; then
    composeFileName="docker-compose.$ENVIRONMENT.yml"
  fi

  if [[ ! -f $composeFileName ]]; then
    echo "$ENVIRONMENT is not a valid parameter. File '$composeFileName' does not exist."
  else
    docker-compose -f $composeFileName -p $projectName down --rmi all

    # Remove any dangling images (from previous builds)
    danglingImages=$(docker images -q --filter 'dangling=true')
    if [[ ! -z $danglingImages ]]; then
      docker rmi -f $danglingImages
    fi
  fi
}

# Builds the Docker image.
buildImage () {
  if [[ -z $ENVIRONMENT ]]; then
    ENVIRONMENT="debug"
  fi

  composeFileName="docker-compose.yml"
  if [[ $ENVIRONMENT != "release" ]]; then
    composeFileName="docker-compose.$ENVIRONMENT.yml"
  fi

  if [[ ! -f $composeFileName ]]; then
    echo "$ENVIRONMENT is not a valid parameter. File '$composeFileName' does not exist."
  else
    echo "Building the project ($ENVIRONMENT)."
    pubFolder="bin/$ENVIRONMENT/$framework/publish"
    dotnet publish -f $framework -r $runtimeID -c $ENVIRONMENT -o $pubFolder

    echo "Building the image $imageName ($ENVIRONMENT)."
    docker-compose -f "$pubFolder/$composeFileName" -p $projectName build
  fi
}

# Runs docker-compose.
compose () {
  if [[ -z $ENVIRONMENT ]]; then
    ENVIRONMENT="debug"
  fi

  composeFileName="docker-compose.yml"
  if [[ $ENVIRONMENT != "release" ]]; then
      composeFileName="docker-compose.$ENVIRONMENT.yml"
  fi

  if [[ ! -f $composeFileName ]]; then
    echo "$ENVIRONMENT is not a valid parameter. File '$composeFileName' does not exist."
  else
    echo "Running compose file $composeFileName"
    docker-compose -f $composeFileName -p $projectName kill
    docker-compose -f $composeFileName -p $projectName up -d
  fi
}

startDebugging () {
  containerId=$(docker ps -f "name=$containerName" -q -n=1)
  if [[ -z $containerId ]]; then
    echo "Could not find a container named $containerName"
  else
    docker exec -i $containerId /clrdbg/clrdbg --interpreter=mi
  fi

}

# Shows the usage for the script.
showUsage () {
  echo "Usage: dockerTask.sh [COMMAND] (ENVIRONMENT)"
  echo "    Runs build or compose using specific environment (if not provided, debug environment is used)"
  echo ""
  echo "Commands:"
  echo "    build: Builds a Docker image ('$imageName')."
  echo "    compose: Runs docker-compose."
  echo "    clean: Removes the image '$imageName' and kills all containers based on that image."
  echo "    composeForDebug: Builds the image and runs docker-compose."
  echo "    startDebugging: Finds the running container and starts the debugger inside of it."
  echo ""
  echo "Environments:"
  echo "    debug: Uses debug environment."
  echo "    release: Uses release environment."
  echo ""
  echo "Example:"
  echo "    ./dockerTask.sh build debug"
  echo ""
  echo "    This will:"
  echo "        Build a Docker image named $imageName using debug environment."
}

if [ $# -eq 0 ]; then
  showUsage
else
  case "$1" in
    "compose")
            ENVIRONMENT=$(echo $2 | tr "[:upper:]" "[:lower:]")
            compose
            ;;
    "composeForDebug")
            ENVIRONMENT=$(echo $2 | tr "[:upper:]" "[:lower:]")
            export REMOTE_DEBUGGING=1
            buildImage
            compose
            ;;
    "startDebugging")
            startDebugging
            ;;
    "build")
            ENVIRONMENT=$(echo $2 | tr "[:upper:]" "[:lower:]")
            buildImage
            ;;
    "clean")
            ENVIRONMENT=$(echo $2 | tr "[:upper:]" "[:lower:]")
            cleanAll
            ;;
    *)
            showUsage
            ;;
  esac
fi
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
    let dockerDebugFile = path.join(vscode.workspace.rootPath, 'Dockerfile.debug');
    let dockerTaskPowerShellFile = path.join(vscode.workspace.rootPath, 'dockerTask.ps1');
    let dockerTaskBashFile = path.join(vscode.workspace.rootPath, 'dockerTask.sh');

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

                if (fs.existsSync(dockerDebugFile)) {
                    vscode.window.showErrorMessage('A Dockerfile.debug already exists. Overwrite?', ...yesNoPrompt).then((item: vscode.MessageItem) => {
                        if (item.title.toLowerCase() === 'yes') {
                            fs.writeFileSync(dockerDebugFile, genDockerDebug(serviceName, platformType), { encoding: 'utf8' });
                        }
                    });
                } else {
                    fs.writeFileSync(dockerDebugFile, genDockerDebug(serviceName, platformType), { encoding: 'utf8' });
                }

                if (fs.existsSync(dockerTaskPowerShellFile)) {
                    vscode.window.showErrorMessage('A dockerTask.ps1 already exists. Overwrite?', ...yesNoPrompt).then((item: vscode.MessageItem) => {
                        if (item.title.toLowerCase() === 'yes') {
                            fs.writeFileSync(dockerTaskPowerShellFile, genDockerPowershell(serviceName, platformType), { encoding: 'utf8' });
                        }
                    });
                } else {
                    fs.writeFileSync(dockerTaskPowerShellFile, genDockerPowershell(serviceName, platformType), { encoding: 'utf8' });
                }

                if (fs.existsSync(dockerTaskBashFile)) {
                    vscode.window.showErrorMessage('A dockerTask.sh already exists. Overwrite?', ...yesNoPrompt).then((item: vscode.MessageItem) => {
                        if (item.title.toLowerCase() === 'yes') {
                            fs.writeFileSync(dockerTaskBashFile, genDockerBash(serviceName, platformType), { encoding: 'utf8' });
                        }
                    });
                } else {
                    fs.writeFileSync(dockerTaskBashFile, genDockerBash(serviceName, platformType), { encoding: 'utf8' });
                }

            });

        });
    });

}

export function configureLaunchJson(): string {
    // contribute a launch.json configuration
    return launchJsonTemplate;
}
