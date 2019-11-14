/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import * as fse from 'fs-extra';
import * as gradleParser from "gradle-to-js/lib/parser";
import * as path from "path";
import * as vscode from "vscode";
import { IActionContext, TelemetryProperties } from 'vscode-azureextensionui';
import * as xml2js from 'xml2js';
import { DockerOrchestration } from '../constants';
import { ext } from '../extensionVariables';
import { captureCancelStep } from '../utils/captureCancelStep';
import { extractRegExGroups } from '../utils/extractRegExGroups';
import { globAsync } from '../utils/globAsync';
import { Platform, PlatformOS } from '../utils/platform';
import { quickPickWorkspaceFolder } from '../utils/quickPickWorkspaceFolder';
import { configureCpp } from './configureCpp';
import { configureAspDotNetCore, configureDotNetCoreConsole } from './configureDotNetCore';
import { configureGo } from './configureGo';
import { configureJava } from './configureJava';
import { configureNode } from './configureNode';
import { configureOther } from './configureOther';
import { configurePython } from './configurePython';
import { configureRuby } from './configureRuby';
import { promptForPorts, quickPickGenerateComposeFiles, quickPickOS, quickPickPlatform } from './configUtils';

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

type ConfigureTelemetryCancelStep = 'folder' | 'platform' | 'os' | 'compose' | 'port';

async function captureConfigureCancelStep<T>(cancelStep: ConfigureTelemetryCancelStep, properties: TelemetryProperties, prompt: () => Promise<T>): Promise<T> {
    return await captureCancelStep(cancelStep, properties, prompt)
}

export type ConfigureTelemetryProperties = {
    configurePlatform?: Platform;
    configureOs?: PlatformOS;
    packageFileType?: string; // 'build.gradle', 'pom.xml', 'package.json', '.csproj', '.fsproj'
    packageFileSubfolderDepth?: string; // 0 = project/etc file in root folder, 1 = in subfolder, 2 = in subfolder of subfolder, etc.
};

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

export function getComposePorts(ports: number[]): string {
    return ports && ports.length > 0 ? '    ports:\n' + ports.map(port => `      - ${port}:${port}`).join('\n') : '';
}

const generatorsByPlatform = new Map<Platform, IPlatformGeneratorInfo>();
generatorsByPlatform.set('ASP.NET Core', configureAspDotNetCore);
generatorsByPlatform.set('C++', configureCpp);
generatorsByPlatform.set('Go', configureGo);
generatorsByPlatform.set('Java', configureJava);
generatorsByPlatform.set('.NET Core Console', configureDotNetCoreConsole);
generatorsByPlatform.set('Node.js', configureNode);
generatorsByPlatform.set('Python', configurePython);
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
    const ignoredItems = [
        '**/.classpath',
        '**/.dockerignore',
        '**/.env',
        '**/.git',
        '**/.gitignore',
        '**/.project',
        '**/.settings',
        '**/.toolstarget',
        '**/.vs',
        '**/.vscode',
        '**/*.*proj.user',
        '**/*.dbmdl',
        '**/*.jfm',
        '**/azds.yaml',
        platformType !== 'Node.js' ? '**/bin' : undefined,
        '**/charts',
        '**/docker-compose*',
        '**/Dockerfile*',
        '**/node_modules',
        '**/npm-debug.log',
        '**/obj',
        '**/secrets.dev.yaml',
        '**/values.dev.yaml',
        'README.md'
    ];

    return ignoredItems.filter(item => item !== undefined).join('\n');
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
    let pkg: PackageInfo = getDefaultPackageInfo(); //default
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
                    reject(`Failed to parse pom.xml: ${error}`);
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

// Returns the relative path of the project file without the extension
async function findCSProjOrFSProjFile(folderPath: string): Promise<string> {
    const opt: vscode.QuickPickOptions = {
        matchOnDescription: true,
        matchOnDetail: true,
        placeHolder: 'Select Project'
    }

    const projectFiles: string[] = await globAsync('**/*.@(c|f)sproj', { cwd: folderPath });

    if (!projectFiles || !projectFiles.length) {
        throw new Error("No .csproj or .fsproj file could be found. You need a C# or F# project file in the workspace to generate Docker files for the selected platform.");
    }

    if (projectFiles.length > 1) {
        let items = projectFiles.map(p => <vscode.QuickPickItem>{ label: p });
        let result = await ext.ui.showQuickPick(items, opt);
        return result.label;
    } else {
        return projectFiles[0];
    }
}

type GeneratorFunction = (serviceName: string, platform: Platform, os: PlatformOS | undefined, ports: number[], packageJson?: Partial<PackageInfo>) => string;
type DebugScaffoldFunction = (context: IActionContext, folder: vscode.WorkspaceFolder, os: PlatformOS, dockerfile: string, packageInfo: PackageInfo) => Promise<void>;

const DOCKER_FILE_TYPES: { [key: string]: { generator: GeneratorFunction, isComposeGenerator?: boolean } } = {
    'docker-compose.yml': { generator: genDockerCompose, isComposeGenerator: true },
    'docker-compose.debug.yml': { generator: genDockerComposeDebug, isComposeGenerator: true },
    'Dockerfile': { generator: genDockerFile },
    '.dockerignore': { generator: genDockerIgnoreFile }
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
     * Ports to expose
     */
    ports?: number[];

    /**
     * The OS for the images. Currently only needed for .NET platforms.
     */
    os?: PlatformOS;

    /**
     * Open the Dockerfile that was generated
     */
    openDockerFile?: boolean;

    /**
     * The workspace folder for configuring
     */
    folder?: vscode.WorkspaceFolder;
}

export async function configure(context: IActionContext, rootFolderPath: string | undefined): Promise<void> {
    const properties: TelemetryProperties & ConfigureTelemetryProperties = context.telemetry.properties;
    let folder: vscode.WorkspaceFolder;
    if (!rootFolderPath) {
        folder = await captureConfigureCancelStep('folder', properties, () => quickPickWorkspaceFolder('To generate Docker files you must first open a folder or workspace in VS Code.'));
        rootFolderPath = folder.uri.fsPath;
    }

    let filesWritten = await configureCore(
        context,
        {
            rootPath: rootFolderPath,
            outputFolder: rootFolderPath,
            openDockerFile: true,
            folder: folder,
        });

    // Open the dockerfile (if written)
    try {
        let dockerfile = filesWritten.find(fp => path.basename(fp).toLowerCase() === 'dockerfile');
        if (dockerfile) {
            await vscode.window.showTextDocument(vscode.Uri.file(dockerfile));
        }
    } catch (err) {
        // Ignore
    }
}

export async function configureApi(context: IActionContext, options: ConfigureApiOptions): Promise<void> {
    await configureCore(context, options);
}

// tslint:disable-next-line:max-func-body-length // Because of nested functions
async function configureCore(context: IActionContext, options: ConfigureApiOptions): Promise<string[]> {
    const properties: TelemetryProperties & ConfigureTelemetryProperties = context.telemetry.properties;
    const rootFolderPath: string = options.rootPath;
    const outputFolder = options.outputFolder;

    const platformType: Platform = options.platform || await captureConfigureCancelStep('platform', properties, quickPickPlatform);
    properties.configurePlatform = platformType;
    let generatorInfo = generatorsByPlatform.get(platformType);

    let os: PlatformOS | undefined = options.os;
    if (!os && platformType.toLowerCase().includes('.net')) {
        os = await captureConfigureCancelStep('os', properties, quickPickOS);
    }
    properties.configureOs = os;
    properties.orchestration = 'single' as DockerOrchestration;

    let generateComposeFiles = true;

    if (platformType === 'Node.js') {
        generateComposeFiles = await captureConfigureCancelStep('compose', properties, quickPickGenerateComposeFiles);
    }

    let ports: number[] | undefined = options.ports;
    if (!ports && generatorInfo.defaultPorts !== undefined) {
        ports = await captureConfigureCancelStep('port', properties, () => promptForPorts(generatorInfo.defaultPorts));
    }

    let targetFramework: string;
    let projFile: string;
    let serviceNameAndPathRelativeToOutput: string;
    {
        // Scope serviceNameAndPathRelativeToRoot only to this block of code
        let serviceNameAndPathRelativeToRoot: string;
        if (platformType.toLowerCase().includes('.net')) {
            let projFilePath = await findCSProjOrFSProjFile(rootFolderPath);
            serviceNameAndPathRelativeToRoot = projFilePath.slice(0, -(path.extname(projFilePath).length));
            let projFileContents = (await fse.readFile(path.join(rootFolderPath, projFilePath))).toString();

            // Extract TargetFramework for version
            [targetFramework] = extractRegExGroups(projFileContents, /<TargetFramework>(.+)<\/TargetFramework/, ['']);
            projFile = projFilePath;

            properties.packageFileType = projFilePath.endsWith('.csproj') ? '.csproj' : '.fsproj';
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
        packageInfo.artifactName = projFile;
    }

    let filesWritten: string[] = [];
    await Promise.all(Object.keys(DOCKER_FILE_TYPES).map(async (fileName) => {
        const dockerFileType = DOCKER_FILE_TYPES[fileName];

        if (dockerFileType.isComposeGenerator && generateComposeFiles) {
            properties.orchestration = 'docker-compose' as DockerOrchestration;
        }

        return dockerFileType.isComposeGenerator !== true || generateComposeFiles
            ? createWorkspaceFileIfNotExists(fileName, dockerFileType.generator)
            : Promise.resolve();
    }));

    // Can only configure for debugging if there's a workspace folder, and there's a scaffold function
    if (options.folder && generatorInfo.initializeForDebugging) {
        await generatorInfo.initializeForDebugging(context, options.folder, os, path.join(outputFolder, 'Dockerfile'), packageInfo);
    }

    return filesWritten;

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
            let fileContents = generatorFunction(serviceNameAndPathRelativeToOutput, platformType, os, ports, packageInfo);
            if (fileContents) {
                fse.writeFileSync(filePath, fileContents, { encoding: 'utf8' });
                filesWritten.push(filePath);
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
