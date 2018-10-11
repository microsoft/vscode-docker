/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fs from 'fs';
import * as fse from 'fs-extra';
import * as gradleParser from "gradle-to-js/lib/parser";
import { EOL } from 'os';
import * as path from "path";
import * as pomParser from "pom-parser";
import * as vscode from "vscode";
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import { quickPickWorkspaceFolder } from '../commands/utils/quickPickWorkspaceFolder';
import { ext } from '../extensionVariables';
import { globAsync } from '../helpers/async';
import { extractRegExGroups } from '../helpers/extractRegExGroups';
import { OS, Platform, promptForPort, quickPickOS, quickPickPlatform } from './config-utils';
import { configureAspDotNetCore, configureDotNetCoreConsole } from './configure_dotnetcore';
import { configureGo } from './configure_go';
import { configureJava } from './configure_java';
import { configureNode } from './configure_node';
import { configureOther } from './configure_other';
import { configurePython } from './configure_python';
import { configureRuby } from './configure_ruby';

export interface PackageInfo {
    npmStart: boolean; //has npm start
    cmd: string;
    fullCommand: string; //full command
    author: string;
    version: string;
    artifactName: string;
}

interface JsonPackageContents {
    main?: string;
    scripts?: { [key: string]: string };
    author?: string;
    version?: string;
}

interface PomXmlContents {
    project?: {
        version?: string;
        artifactid?: string;
    };
}

export type ConfigureTelemetryProperties = {
    configurePlatform?: Platform;
    configureOs?: OS;
    packageFileType?: string; // 'build.gradle', 'pom.xml', 'package.json', '.csproj'
    packageFileSubfolderDepth?: string; // 0 = project/etc file in root folder, 1 = in subfolder, 2 = in subfolder of subfolder, etc.
};

export interface IPlatformGeneratorInfo {
    genDockerFile: GeneratorFunction,
    genDockerCompose: GeneratorFunction,
    genDockerComposeDebug: GeneratorFunction,
    defaultPort: string
}

export function getExposeStatements(port: string): string {
    return port ? `EXPOSE ${port}` : '';
}

const generatorsByPlatform = new Map<Platform, IPlatformGeneratorInfo>();
generatorsByPlatform.set('ASP.NET Core', configureAspDotNetCore);
generatorsByPlatform.set('Go', configureGo);
generatorsByPlatform.set('Java', configureJava);
generatorsByPlatform.set('.NET Core Console', configureDotNetCoreConsole);
generatorsByPlatform.set('Node.js', configureNode);
generatorsByPlatform.set('Python', configurePython);
generatorsByPlatform.set('Ruby', configureRuby);
generatorsByPlatform.set('Other', configureOther);

function genDockerFile(serviceNameAndRelativePath: string, platform: Platform, os: OS | undefined, port: string | undefined, { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
    let generators = generatorsByPlatform.get(platform);
    assert(generators, `Could not find dockerfile generator functions for "${platform}"`);
    if (generators.genDockerFile) {
        let contents = generators.genDockerFile(serviceNameAndRelativePath, platform, os, port, { cmd, author, version, artifactName });

        // Remove multiple empty lines with single empty lines, as might be produced
        // if $expose_statements$ or another template variable is an empty string
        contents = contents.replace(/(\r\n){3}/g, "\r\n\r\n")
            .replace(/(\n){3}/g, "\n\n");

        return contents;
    }
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: Platform, os: OS | undefined, port: string): string {
    let generators = generatorsByPlatform.get(platform);
    assert(generators, `Could not find docker compose file generator function for "${platform}"`);
    if (generators.genDockerCompose) {
        return generators.genDockerCompose(serviceNameAndRelativePath, platform, os, port);
    }
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: Platform, os: OS | undefined, port: string, packageInfo: Partial<PackageInfo>): string {
    let generators = generatorsByPlatform.get(platform);
    assert(generators, `Could not find docker debug compose file generator function for "${platform}"`);
    if (generators.genDockerComposeDebug) {
        return generators.genDockerComposeDebug(serviceNameAndRelativePath, platform, os, port, packageInfo);
    }
}

function genDockerIgnoreFile(service: string, platformType: string, os: string, port: string): string {
    return `node_modules
npm-debug.log
Dockerfile*
docker-compose*
.dockerignore
.git
.gitignore
.env
*/bin
*/obj
README.md
LICENSE
.vscode`;
}

async function getPackageJson(folderPath: string): Promise<vscode.Uri[]> {
    return vscode.workspace.findFiles(new vscode.RelativePattern(folderPath, 'package.json'), null, 1, undefined);
}

function getDefaultPackageInfo(): PackageInfo {
    return {
        npmStart: true,
        fullCommand: 'npm start',
        cmd: 'npm start',
        author: 'author',
        version: '0.0.1',
        artifactName: ''
    };
}

async function readPackageJson(folderPath: string): Promise<{ packagePath?: string, packageInfo: PackageInfo }> {
    // open package.json and look for main, scripts start
    const uris: vscode.Uri[] = await getPackageJson(folderPath);
    let packageInfo: PackageInfo = getDefaultPackageInfo(); //default
    let packagePath: string | undefined;

    if (uris && uris.length > 0) {
        packagePath = uris[0].fsPath;
        const json = <JsonPackageContents>JSON.parse(fs.readFileSync(packagePath, 'utf8'));

        if (json.scripts && typeof json.scripts.start === "string") {
            packageInfo.npmStart = true;
            packageInfo.fullCommand = json.scripts.start;
            packageInfo.cmd = 'npm start';
        } else if (typeof json.main === "string") {
            packageInfo.npmStart = false;
            packageInfo.fullCommand = 'node' + ' ' + json.main;
            packageInfo.cmd = packageInfo.fullCommand;
        } else {
            packageInfo.fullCommand = '';
        }

        if (typeof json.author === "string") {
            packageInfo.author = json.author;
        }

        if (typeof json.version === "string") {
            packageInfo.version = json.version;
        }
    }

    return { packagePath, packageInfo };
}

/**
 * Looks for a pom.xml or build.gradle file, and returns its parsed contents, or else a default package contents if none path
 */
async function readPomOrGradle(folderPath: string): Promise<{ foundPath?: string, packageInfo: PackageInfo }> {
    let pkg: PackageInfo = getDefaultPackageInfo(); //default
    let foundPath: string | undefined;

    let pomPath = path.join(folderPath, 'pom.xml');
    let gradlePath = path.join(folderPath, 'build.gradle');

    if (await fse.pathExists(pomPath)) {
        foundPath = pomPath;
        let json = await new Promise<PomXmlContents>((resolve, reject) => {
            // tslint:disable-next-line:no-unsafe-any
            pomParser.parse({
                filePath: pomPath
            }, (error, response: { pomObject: PomXmlContents }) => {
                if (error) {
                    reject(`Failed to parse pom.xml: ${error}`);
                    return;
                }
                resolve(response.pomObject);
            });
        });
        json = json || {};

        if (json.project && json.project.version) {
            pkg.version = json.project.version;
        }

        if (json.project && json.project.artifactid) {
            pkg.artifactName = `target/${json.project.artifactid}-${pkg.version}.jar`;
        }
    } else if (await fse.pathExists(gradlePath)) {
        foundPath = gradlePath;
        const json: {
            archivesBaseName?: string;
            jar?: { version?: string; archiveName?: string; baseName?: string; };
            version?: string;
            // tslint:disable-next-line:no-unsafe-any
        } = await gradleParser.parseFile(gradlePath);

        if (json.jar && json.jar.version) {
            pkg.version = json.jar.version;
        } else if (json.version) {
            pkg.version = json.version;
        }

        if (json.jar && json.jar.archiveName) {
            pkg.artifactName = `build/libs/${json.jar.archiveName}`;
        } else {
            const baseName = json.jar && json.jar.baseName ? json.jar.baseName : json.archivesBaseName || path.basename(folderPath);
            pkg.artifactName = `build/libs/${baseName}-${pkg.version}.jar`;
        }
    }

    return { foundPath, packageInfo: pkg };
}

// Returns the relative path of the project file without the extension
async function findCSProjFile(folderPath: string): Promise<string> {
    const opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Project'
    }

    const projectFiles: string[] = await globAsync('**/*.csproj', { cwd: folderPath });

    if (!projectFiles || !projectFiles.length) {
        throw new Error("No .csproj file could be found.");
    }

    if (projectFiles.length > 1) {
        let items = projectFiles.map(p => <vscode.QuickPickItem>{ label: p });
        let result = await ext.ui.showQuickPick(items, opt);
        return result.label;
    } else {
        return projectFiles[0];
    }
}

type GeneratorFunction = (serviceName: string, platform: Platform, os: OS | undefined, port: string, packageJson?: Partial<PackageInfo>) => string;

const DOCKER_FILE_TYPES: { [key: string]: GeneratorFunction } = {
    'docker-compose.yml': genDockerCompose,
    'docker-compose.debug.yml': genDockerComposeDebug,
    'Dockerfile': genDockerFile,
    '.dockerignore': genDockerIgnoreFile
};

const YES_PROMPT: vscode.MessageItem = {
    title: "Yes",
    isCloseAffordance: false
};
const YES_OR_NO_PROMPTS: vscode.MessageItem[] = [
    YES_PROMPT,
    {
        title: "No",
        isCloseAffordance: true
    }
];

export interface ConfigureApiOptions {
    /**
     * Root folder from which to search for .csproj, package.json, .pom or .gradle files
     */
    rootPath: string;

    /**
     * Output folder for the docker files. Relative paths in the Dockerfile we will calculated based on this folder
     */
    outputFolder: string;

    /**
     * Platform
     */
    platform?: Platform;

    /**
     * Port to expose
     */
    port?: string;

    /**
     * The OS for the images. Currently only needed for .NET platforms.
     */
    os?: OS;

    /**
     * Open the Dockerfile that was generated
     */
    openDockerFile?: boolean;
}

export async function configure(actionContext: IActionContext, rootFolderPath: string | undefined): Promise<void> {
    if (!rootFolderPath) {
        let folder: vscode.WorkspaceFolder = await quickPickWorkspaceFolder('To generate Docker files you must first open a folder or workspace in VS Code.');
        rootFolderPath = folder.uri.fsPath;
    }

    let filesWritten = await configureCore(
        actionContext,
        {
            rootPath: rootFolderPath,
            outputFolder: rootFolderPath,
            openDockerFile: true
        });

    // Open the dockerfile (if written)
    try {
        let dockerfile = filesWritten.find(fp => path.basename(fp).toLowerCase() === 'dockerfile');
        if (dockerfile) {
            vscode.window.showTextDocument(vscode.Uri.file(dockerfile));
        }
    } catch (err) {
        // Ignore
    }
}

export async function configureApi(actionContext: IActionContext, options: ConfigureApiOptions): Promise<void> {
    await configureCore(actionContext, options);
}

// tslint:disable-next-line:max-func-body-length // Because of nested functions
async function configureCore(actionContext: IActionContext, options: ConfigureApiOptions): Promise<string[]> {
    let properties: TelemetryProperties & ConfigureTelemetryProperties = actionContext.properties;
    let rootFolderPath: string = options.rootPath;
    let outputFolder = options.outputFolder;

    const platformType: Platform = options.platform || await quickPickPlatform();
    properties.configurePlatform = platformType;
    let generatorInfo = generatorsByPlatform.get(platformType);

    let os: OS | undefined = options.os;
    if (!os && platformType.toLowerCase().includes('.net')) {
        os = await quickPickOS();
    }
    properties.configureOs = os;

    let port: string | undefined = options.port;
    if (!port) {
        port = await promptForPort(generatorInfo.defaultPort);
    }

    let targetFramework: string;
    let serviceNameAndPathRelativeToOutput: string;
    {
        // Scope serviceNameAndPathRelativeToRoot only to this block of code
        let serviceNameAndPathRelativeToRoot: string;
        if (platformType.toLowerCase().includes('.net')) {
            let csProjFilePath = await findCSProjFile(rootFolderPath);
            serviceNameAndPathRelativeToRoot = csProjFilePath.slice(0, -'.csproj'.length);
            let csProjFileContents = (await fse.readFile(path.join(rootFolderPath, csProjFilePath))).toString();

            // Extract TargetFramework for version
            [targetFramework] = extractRegExGroups(csProjFileContents, /<TargetFramework>(.+)<\/TargetFramework/, ['']);

            properties.packageFileType = '.csproj';
            properties.packageFileSubfolderDepth = getSubfolderDepth(serviceNameAndPathRelativeToRoot);
        } else {
            serviceNameAndPathRelativeToRoot = path.basename(rootFolderPath).toLowerCase();
        }

        // We need paths in the Dockerfile to be relative to the output folder, not the root
        serviceNameAndPathRelativeToOutput = path.relative(outputFolder, path.join(rootFolderPath, serviceNameAndPathRelativeToRoot));
        serviceNameAndPathRelativeToOutput = serviceNameAndPathRelativeToOutput.replace(/\\/g, '/');
    }

    let packageInfo: PackageInfo = getDefaultPackageInfo();
    if (platformType === 'Java') {
        let foundPomOrGradlePath: string | undefined;
        ({ packageInfo, foundPath: foundPomOrGradlePath } = await readPomOrGradle(rootFolderPath));
        if (foundPomOrGradlePath) {
            properties.packageFileType = path.basename(foundPomOrGradlePath);
            properties.packageFileSubfolderDepth = getSubfolderDepth(foundPomOrGradlePath);
        }
    } else {
        let packagePath: string | undefined;
        ({ packagePath, packageInfo } = await readPackageJson(rootFolderPath));
        if (packagePath) {
            properties.packageFileType = 'package.json';
            properties.packageFileSubfolderDepth = getSubfolderDepth(packagePath);
        }
    }

    if (targetFramework) {
        packageInfo.version = targetFramework;
    }

    let filesWritten: string[] = [];
    await Promise.all(Object.keys(DOCKER_FILE_TYPES).map(async (fileName) => {
        return createWorkspaceFileIfNotExists(fileName, DOCKER_FILE_TYPES[fileName]);
    }));

    async function createWorkspaceFileIfNotExists(fileName: string, generatorFunction: GeneratorFunction): Promise<void> {
        const filePath = path.join(outputFolder, fileName);
        let writeFile = false;
        if (await fse.pathExists(filePath)) {
            const response: vscode.MessageItem | undefined = await vscode.window.showErrorMessage(`"${fileName}" already exists. Would you like to overwrite it?`, ...YES_OR_NO_PROMPTS);
            if (response === YES_PROMPT) {
                writeFile = true;
            }
        } else {
            writeFile = true;
        }

        if (writeFile) {
            // Paths in the docker files should be relative to the Dockerfile (which is in the output folder)
            let fileContents = generatorFunction(serviceNameAndPathRelativeToOutput, platformType, os, port, packageInfo);
            if (fileContents) {
                fs.writeFileSync(filePath, fileContents, { encoding: 'utf8' });
                filesWritten.push(fileName);
            }
        }
    }

    function getSubfolderDepth(filePath: string): string {
        let relativeToRoot = path.relative(outputFolder, path.resolve(outputFolder, filePath));
        let matches = relativeToRoot.match(/[\/\\]/g);
        let depth: number = matches ? matches.length : 0;
        return String(depth);
    }
}
