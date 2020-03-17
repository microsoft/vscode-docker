/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as gradleParser from "gradle-to-js/lib/parser";
import * as path from "path";
import * as vscode from "vscode";
import { IActionContext, parseError, TelemetryProperties } from 'vscode-azureextensionui';
import * as xml2js from 'xml2js';
import { localize } from '../localize';
import { Platform, PlatformOS } from '../utils/platform';
import { configureCpp } from './configureCpp';
import { scaffoldNetCore } from './configureDotNetCore';
import { configureGo } from './configureGo';
import { configureJava } from './configureJava';
import { configureNode } from './configureNode';
import { configureOther } from './configureOther';
import { scaffoldPython } from './configurePython';
import { configureRuby } from './configureRuby';
import { ConfigureTelemetryProperties, genCommonDockerIgnoreFile, getSubfolderDepth } from './configUtils';
import { openFilesIfRequired, registerScaffolder, scaffold, Scaffolder, ScaffolderContext, ScaffoldFile } from './scaffolding';

export interface PackageInfo {
    npmStart: boolean; // has npm start
    cmd: string;
    fullCommand: string; // full command
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

export interface IPlatformGeneratorInfo {
    genDockerFile: GeneratorFunction,
    genDockerCompose: GeneratorFunction,
    genDockerComposeDebug: GeneratorFunction,
    defaultPorts: number[] | undefined, // [] = defaults to empty but still asks user if they want a port, undefined = don't ask at all
    initializeForDebugging: DebugScaffoldFunction | undefined,
}

export function getExposeStatements(ports: number[]): string {
    return ports ? ports.map(port => `EXPOSE ${port}`).join('\n') : '';
}

export function getComposePorts(ports: number[], debugPort?: number): string {
    let portMappings: string[] = ports?.map(port => `      - ${port}`) ?? [];

    if (debugPort) {
        portMappings.push(`      - ${debugPort}:${debugPort}`);
    }

    return portMappings && portMappings.length > 0 ? '    ports:\n' + portMappings.join('\n') : '';
}

function configureScaffolder(generator: IPlatformGeneratorInfo): Scaffolder {
    return async context => {
        let files = await configureCore(
            context,
            {
                folder: context.folder,
                os: context.os,
                outputFolder: context.outputFolder,
                platform: context.platform,
                ports: context.ports,
                rootPath: context.rootFolder,
            });

        const updatedFiles = files.map(
            file => {
                return {
                    fileName: file.fileName,
                    contents: file.contents,
                    open: path.basename(file.fileName).toLowerCase() === 'dockerfile'
                };
            });

        return updatedFiles;
    };
}

registerScaffolder('Node.js', configureScaffolder(configureNode));
registerScaffolder('.NET: ASP.NET Core', scaffoldNetCore);
registerScaffolder('.NET: Core Console', scaffoldNetCore);
registerScaffolder('Python: Django', scaffoldPython);
registerScaffolder('Python: Flask', scaffoldPython);
registerScaffolder('Python: General', scaffoldPython);
registerScaffolder('Java', configureScaffolder(configureJava));
registerScaffolder('C++', configureScaffolder(configureCpp));
registerScaffolder('Go', configureScaffolder(configureGo));
registerScaffolder('Ruby', configureScaffolder(configureRuby));
registerScaffolder('Other', configureScaffolder(configureOther));

const generatorsByPlatform = new Map<Platform, IPlatformGeneratorInfo>();
generatorsByPlatform.set('C++', configureCpp);
generatorsByPlatform.set('Go', configureGo);
generatorsByPlatform.set('Java', configureJava);
generatorsByPlatform.set('Node.js', configureNode);
generatorsByPlatform.set('Ruby', configureRuby);
generatorsByPlatform.set('Other', configureOther);

function genDockerFile(serviceNameAndRelativePath: string, platform: Platform, os: PlatformOS | undefined, ports: number[] | undefined, { cmd, author, version, artifactName }: Partial<PackageInfo>): string {
    let generators = generatorsByPlatform.get(platform);
    assert(generators, `Could not find dockerfile generator functions for "${platform}"`);
    if (generators.genDockerFile) {
        let contents = generators.genDockerFile(serviceNameAndRelativePath, platform, os, ports, { cmd, author, version, artifactName });

        // Remove multiple empty lines with single empty lines, as might be produced
        // if $expose_statements$ or another template variable is an empty string
        contents = contents.replace(/(\r\n){3,4}/g, "\r\n\r\n")
            .replace(/(\n){3,4}/g, "\n\n");

        return contents;
    }
}

function genDockerCompose(serviceNameAndRelativePath: string, platform: Platform, os: PlatformOS | undefined, ports: number[]): string {
    let generators = generatorsByPlatform.get(platform);
    assert(generators, `Could not find docker compose file generator function for "${platform}"`);
    if (generators.genDockerCompose) {
        return generators.genDockerCompose(serviceNameAndRelativePath, platform, os, ports);
    }
}

function genDockerComposeDebug(serviceNameAndRelativePath: string, platform: Platform, os: PlatformOS | undefined, ports: number[], packageInfo: Partial<PackageInfo>): string {
    let generators = generatorsByPlatform.get(platform);
    assert(generators, `Could not find docker debug compose file generator function for "${platform}"`);
    if (generators.genDockerComposeDebug) {
        return generators.genDockerComposeDebug(serviceNameAndRelativePath, platform, os, ports, packageInfo);
    }
}

function genDockerIgnoreFile(service: string, platformType: Platform, os: string, ports: number[]): string {
    return genCommonDockerIgnoreFile(platformType);
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
    let packageInfo: PackageInfo = getDefaultPackageInfo(); // default
    let packagePath: string | undefined;

    if (uris && uris.length > 0) {
        packagePath = uris[0].fsPath;
        const json = <JsonPackageContents>JSON.parse(fse.readFileSync(packagePath, 'utf8'));

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
    let pkg: PackageInfo = getDefaultPackageInfo();  // default
    let foundPath: string | undefined;

    let pomPath = path.join(folderPath, 'pom.xml');
    let gradlePath = path.join(folderPath, 'build.gradle');

    if (await fse.pathExists(pomPath)) {
        foundPath = pomPath;
        const pomString = await fse.readFile(pomPath);
        let json = await new Promise<PomXmlContents>((resolve, reject) => {
            const options = {
                trim: true,
                normalizeTags: true,
                normalize: true,
                mergeAttrs: true
            };
            // tslint:disable-next-line:no-unsafe-any
            xml2js.parseString(pomString, options, (error, result: PomXmlContents): void => {
                if (error) {
                    reject(localize('vscode-docker.configure.pomError', 'Failed to parse pom.xml: {0}', parseError(error).message));
                    return;
                }
                resolve(result);
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

type GeneratorFunction = (serviceName: string, platform: Platform, os: PlatformOS | undefined, ports: number[], packageJson?: Partial<PackageInfo>) => string;
type DebugScaffoldFunction = (context: IActionContext, folder: vscode.WorkspaceFolder, os: PlatformOS, dockerfile: string, packageInfo: PackageInfo) => Promise<void>;

const DOCKER_FILE_TYPES: { [key: string]: { generator: GeneratorFunction, isComposeGenerator?: boolean } } = {
    'docker-compose.yml': { generator: genDockerCompose, isComposeGenerator: true },
    'docker-compose.debug.yml': { generator: genDockerComposeDebug, isComposeGenerator: true },
    'Dockerfile': { generator: genDockerFile },
    '.dockerignore': { generator: genDockerIgnoreFile }
};

export interface ConfigureApiOptions {
    /**
     * Determines whether to add debugging tasks/configuration during scaffolding.
     */
    initializeForDebugging?: boolean;

    /**
     * Root folder from which to search for .csproj, package.json, .pom or .gradle files
     */
    rootPath: string;

    /**
     * Output folder for the docker files. Relative paths in the Dockerfile we will calculated based on this folder
     */
    outputFolder?: string;

    /**
     * Platform
     */
    platform?: Platform;

    /**
     * Ports to expose
     */
    ports?: number[];

    /**
     * The OS for the images. Currently only needed for .NET platforms.
     */
    os?: PlatformOS;

    /**
     * The workspace folder for configuring
     */
    folder?: vscode.WorkspaceFolder;
}

export async function configure(context: IActionContext, rootFolderPath: string | undefined): Promise<void> {
    const scaffoldContext = {
        ...context,
        // NOTE: Currently only tests use rootFolderPath and they do not function when debug tasks/configuration are added.
        // TODO: Refactor tests to allow for (and verify) debug tasks/configuration.
        initializeForDebugging: rootFolderPath === undefined,
        rootFolder: rootFolderPath
    };

    const files = await scaffold(scaffoldContext);
    openFilesIfRequired(files);
}

export async function configureApi(context: IActionContext, options: ConfigureApiOptions): Promise<void> {
    const scaffoldContext = {
        ...context,
        folder: options?.folder,
        initializeForDebugging: options?.initializeForDebugging,
        os: options?.os,
        outputFolder: options?.outputFolder,
        platform: options?.platform,
        ports: options?.ports,
        rootFolder: options?.rootPath,
    };

    await scaffold(scaffoldContext);
}

// tslint:disable-next-line:max-func-body-length // Because of nested functions
async function configureCore(context: ScaffolderContext, options: ConfigureApiOptions): Promise<ScaffoldFile[]> {
    const properties: TelemetryProperties & ConfigureTelemetryProperties = context.telemetry.properties;
    const rootFolderPath: string = options.rootPath;
    const outputFolder = options.outputFolder ?? rootFolderPath;

    const platformType: Platform = options.platform;
    let generatorInfo = generatorsByPlatform.get(platformType);

    let os: PlatformOS | undefined = options.os;
    properties.configureOs = os;

    let generateComposeFiles = true;

    if (platformType === 'Node.js') {
        generateComposeFiles = await context.promptForCompose();
        if (generateComposeFiles) {
            properties.orchestration = 'docker-compose';
        }
    }

    let ports: number[] | undefined = options.ports;
    if (!ports && generatorInfo.defaultPorts !== undefined) {
        ports = await context.promptForPorts(generatorInfo.defaultPorts);
    }

    let targetFramework: string;
    let projFile: string;
    let serviceNameAndPathRelativeToOutput: string;
    {
        // Scope serviceNameAndPathRelativeToRoot only to this block of code
        let serviceNameAndPathRelativeToRoot: string;
        serviceNameAndPathRelativeToRoot = path.basename(rootFolderPath).toLowerCase();

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
            properties.packageFileSubfolderDepth = getSubfolderDepth(outputFolder, foundPomOrGradlePath);
        }
    } else {
        let packagePath: string | undefined;
        ({ packagePath, packageInfo } = await readPackageJson(rootFolderPath));
        if (packagePath) {
            properties.packageFileType = 'package.json';
            properties.packageFileSubfolderDepth = getSubfolderDepth(outputFolder, packagePath);
        }
    }

    if (targetFramework) {
        packageInfo.version = targetFramework;
        packageInfo.artifactName = projFile;
    }

    let filesWritten: ScaffoldFile[] = [];
    await Promise.all(Object.keys(DOCKER_FILE_TYPES).map(async (fileName) => {
        const dockerFileType = DOCKER_FILE_TYPES[fileName];

        if (dockerFileType.isComposeGenerator && generateComposeFiles) {
            properties.orchestration = 'docker-compose';
        }

        return dockerFileType.isComposeGenerator !== true || generateComposeFiles
            ? createWorkspaceFileIfNotExists(fileName, dockerFileType.generator)
            : Promise.resolve();
    }));

    // Can only configure for debugging if there's a workspace folder, and there's a scaffold function
    if (options.folder && context.initializeForDebugging && generatorInfo.initializeForDebugging) {
        await generatorInfo.initializeForDebugging(context, options.folder, os, path.join(outputFolder, 'Dockerfile'), packageInfo);
    }

    return filesWritten;

    async function createWorkspaceFileIfNotExists(fileName: string, generatorFunction: GeneratorFunction): Promise<void> {
        // Paths in the docker files should be relative to the Dockerfile (which is in the output folder)
        let fileContents = generatorFunction(serviceNameAndPathRelativeToOutput, platformType, os, ports, packageInfo);
        if (fileContents) {
            filesWritten.push({ contents: fileContents, fileName });
        }
    }
}
