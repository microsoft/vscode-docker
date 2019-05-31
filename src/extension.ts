/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import ContainerRegistryManagementClient from 'azure-arm-containerregistry';
import { WebhookCreateParameters } from 'azure-arm-containerregistry/lib/models';
import { ResourceGroup } from 'azure-arm-resource/lib/resource/models';
import { User } from 'azure-arm-website/lib/models';
import * as clipboardy from 'clipboardy';
import * as fse from 'fs-extra';
import * as path from 'path';
import { CoreOptions } from 'request';
import { RequestPromise } from 'request-promise-native';
import * as request from 'request-promise-native';
import * as vscode from 'vscode';
import { AzureUserInput, callWithTelemetryAndErrorHandling, createTelemetryReporter, IActionContext, registerCommand as uiRegisterCommand, registerUIExtensionVariables, TelemetryProperties, UserCancelledError } from 'vscode-azureextensionui';
import { ConfigurationParams, DidChangeConfigurationNotification, DocumentSelector, LanguageClient, LanguageClientOptions, Middleware, ServerOptions, TransportKind } from 'vscode-languageclient/lib/main';
import { AzureAccountWrapper } from '../explorer/deploy/azureAccountWrapper';
import { WebAppCreator } from '../explorer/deploy/webAppCreator';
import { DockerExplorerProvider } from '../explorer/dockerExplorerProvider';
import { AzureImageTagNode } from '../explorer/models/azureRegistryNodes';
import { connectCustomRegistry, disconnectCustomRegistry } from '../explorer/models/customRegistries';
import { DockerHubImageTagNode } from '../explorer/models/dockerHubNodes';
import { NodeBase } from '../explorer/models/nodeBase';
import { browseAzurePortal } from '../explorer/utils/browseAzurePortal';
import { browseDockerHub, dockerHubLogin, dockerHubLogout } from '../explorer/utils/dockerHubUtils';
import { LogContentProvider } from "./commands/azure/acr-log-utils/LogContentProvider";
import { AzureTaskContentProvider } from "./commands/azure/AzureTaskContentProvider";
import { createAzureRegistry } from './commands/azure/createAzureRegistry';
import { deleteAzureImage } from './commands/azure/deleteAzureImage';
import { deleteAzureRegistry } from './commands/azure/deleteAzureRegistry';
import { deleteAzureRepository } from './commands/azure/deleteAzureRepository';
import { pullAzureImage, pullAzureRepository } from './commands/azure/pullFromAzure';
import { runAzureQuickBuild } from "./commands/azure/runAzureQuickBuild";
import { runAzureTask, runAzureTaskFromFile } from "./commands/azure/runAzureTask";
import { showAzureTaskProperties } from "./commands/azure/showAzureTaskProperties";
import { untagAzureImage } from './commands/azure/untagAzureImage';
import { viewAzureLogs } from "./commands/azure/viewAzureLogs";
import { buildImage } from './commands/buildImage';
import { composeDown, composeRestart, composeUp } from './commands/compose';
import inspectImage from './commands/inspectImage';
import { openShellContainer } from './commands/openShellContainer';
import { pushImage } from './commands/pushImage';
import { consolidateDefaultRegistrySettings, setRegistryAsDefault } from './commands/registrySettings';
import { removeContainer } from './commands/removeContainer';
import { removeImage } from './commands/removeImage';
import { restartContainer } from './commands/restartContainer';
import { showLogsContainer } from './commands/showLogsContainer';
import { startAzureCLI, startContainer, startContainerInteractive } from './commands/startContainer';
import { stopContainer } from './commands/stopContainer';
import { systemPrune } from './commands/systemPrune';
import { tagImage } from './commands/tagImage';
import { configure, configureApi } from './configureWorkspace/configure';
import { DockerDebugConfigProvider } from './configureWorkspace/DockerDebugConfigProvider';
import { COMPOSE_FILE_GLOB_PATTERN, configPrefix, configurationKeys, ignoreBundle } from './constants';
import { registerDebugConfigurationProvider } from './debugging/coreclr/registerDebugConfigurationProvider';
import { DockerComposeCompletionItemProvider } from './dockerCompose/dockerComposeCompletionItemProvider';
import { DockerComposeHoverProvider } from './dockerCompose/dockerComposeHoverProvider';
import composeVersionKeys from './dockerCompose/dockerComposeKeyInfo';
import { DockerComposeParser } from './dockerCompose/dockerComposeParser';
import { DockerfileCompletionItemProvider } from './dockerfile/dockerfileCompletionItemProvider';
import DockerInspectDocumentContentProvider, { SCHEME as DOCKER_INSPECT_SCHEME } from './documentContentProviders/dockerInspect';
import { AzureAccountWrapper } from './explorer/deploy/azureAccountWrapper';
import { getWebAppPublishCredential } from './explorer/deploy/util';
import { ResourceGroupStep, WebAppCreator, WebsiteStep } from './explorer/deploy/webAppCreator';
import { DockerExplorerProvider } from './explorer/dockerExplorerProvider';
import { AzureImageTagNode, AzureRegistryNode, AzureRepositoryNode } from './explorer/models/azureRegistryNodes';
import { ContainerNode } from './explorer/models/containerNode';
import { connectCustomRegistry, disconnectCustomRegistry } from './explorer/models/customRegistries';
import { DockerHubImageTagNode, DockerHubOrgNode, DockerHubRepositoryNode } from './explorer/models/dockerHubNodes';
import { ImageNode } from './explorer/models/imageNode';
import { NodeBase } from './explorer/models/nodeBase';
import { RootNode } from './explorer/models/rootNode';
import { browseAzurePortal } from './explorer/utils/browseAzurePortal';
import { browseDockerHub, dockerHubLogin, dockerHubLogout } from './explorer/utils/dockerHubUtils';
import { DockerfileCompletionItemProvider } from './dockerfileCompletionItemProvider';
import DockerInspectDocumentContentProvider, { SCHEME as DOCKER_INSPECT_SCHEME } from './dockerInspect';
import { DefaultImageGrouping, ext, ImageGrouping } from './extensionVariables';
import { addUserAgent } from './utils/addUserAgent';
import { AzureUtilityManager } from './utils/azureUtilityManager';
import { docker } from './utils/docker-endpoint';
import { getTrustedCertificates } from './utils/getTrustedCertificates';
import { Keytar } from './utils/keytar';
import { DefaultTerminalProvider } from './utils/TerminalProvider';
import { wrapError } from './utils/wrapError';

export type KeyInfo = { [keyName: string]: string };

export interface ComposeVersionKeys {
  All: KeyInfo;
  v1: KeyInfo;
  v2: KeyInfo;
}

let client: LanguageClient;

const DOCUMENT_SELECTOR: DocumentSelector = [
  { language: 'dockerfile', scheme: 'file' }
];

function initializeExtensionVariables(ctx: vscode.ExtensionContext): void {
  if (!ext.ui) {
    // This allows for standard interactions with the end user (as opposed to test input)
    ext.ui = new AzureUserInput(ctx.globalState);
  }
  ext.context = ctx;

  ext.outputChannel = vscode.window.createOutputChannel("Docker");
  ctx.subscriptions.push(ext.outputChannel);

  if (!ext.terminalProvider) {
    ext.terminalProvider = new DefaultTerminalProvider();
  }
  ext.reporter = createTelemetryReporter(ctx);
  if (!ext.keytar) {
    ext.keytar = Keytar.tryCreate();
  }

  registerUIExtensionVariables(ext);
}

export async function activateInternal(ctx: vscode.ExtensionContext, perfStats: { loadStartTime: number, loadEndTime: number | undefined }): Promise<void> {
  perfStats.loadEndTime = Date.now();

  initializeExtensionVariables(ctx);
  await setRequestDefaults();
  await callWithTelemetryAndErrorHandling('docker.activate', async (activateContext: IActionContext) => {
    activateContext.telemetry.properties.isActivationEvent = 'true';
    activateContext.telemetry.measurements.mainFileLoad = (perfStats.loadEndTime - perfStats.loadStartTime) / 1000;

    ctx.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        DOCUMENT_SELECTOR,
        new DockerfileCompletionItemProvider(),
        '.'
      )
    );

    const YAML_MODE_ID: vscode.DocumentFilter = {
      language: 'yaml',
      scheme: 'file',
      pattern: COMPOSE_FILE_GLOB_PATTERN
    };
    let yamlHoverProvider = new DockerComposeHoverProvider(
      new DockerComposeParser(),
      composeVersionKeys.All
    );
    ctx.subscriptions.push(
      vscode.languages.registerHoverProvider(YAML_MODE_ID, yamlHoverProvider)
    );
    ctx.subscriptions.push(
      vscode.languages.registerCompletionItemProvider(
        YAML_MODE_ID,
        new DockerComposeCompletionItemProvider(),
        "."
      )
    );

    ctx.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        DOCKER_INSPECT_SCHEME,
        new DockerInspectDocumentContentProvider()
      )
    );
    ctx.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        LogContentProvider.scheme,
        new LogContentProvider()
      )
    );
    ctx.subscriptions.push(
      vscode.workspace.registerTextDocumentContentProvider(
        AzureTaskContentProvider.scheme,
        new AzureTaskContentProvider()
      )
    );

    registerDockerCommands();

    ctx.subscriptions.push(
      vscode.debug.registerDebugConfigurationProvider(
        'docker',
        new DockerDebugConfigProvider()
      )
    );
    registerDebugConfigurationProvider(ctx);
    readImageGrouping();

    await consolidateDefaultRegistrySettings();
    activateLanguageClient();

    // Start loading the Azure account after we're completely done activating.
    setTimeout(
      // Do not wait
      // tslint:disable-next-line:promise-function-async
      () => AzureUtilityManager.getInstance().tryGetAzureAccount(),
      1);
  });
}

async function setRequestDefaults(): Promise<void> {
  // Set up the user agent for all direct 'request' calls in the extension (as long as they use ext.request)
  // ...  Trusted root certificate authorities
  let caList = await getTrustedCertificates();
  let defaultRequestOptions: CoreOptions = { agentOptions: { ca: caList } };
  // ... User agent
  addUserAgent(defaultRequestOptions);
  let requestWithDefaults = request.defaults(defaultRequestOptions);

  // Wrap 'get' to provide better error message for self-signed certificates
  let originalGet = <(...args: unknown[]) => RequestPromise>requestWithDefaults.get;
  // tslint:disable-next-line:no-any
  async function wrappedGet(this: unknown, ...args: unknown[]): Promise<any> {
    try {
      // tslint:disable-next-line: no-unsafe-any
      return await originalGet.call(this, ...args);
    } catch (err) {
      let error = <{ cause?: { code?: string } }>err;

      if (error && error.cause && error.cause.code === 'UNABLE_TO_VERIFY_LEAF_SIGNATURE') {
        err = wrapError(err, `There was a problem verifying a certificate. This could be caused by a self-signed or corporate certificate. You may need to set the 'docker.importCertificates' setting to true.`)
      }

      throw err;
    }
  }

  // tslint:disable-next-line:no-any
  requestWithDefaults.get = <any>wrappedGet;

  ext.request = requestWithDefaults;
}

async function createWebApp(_context: IActionContext, node?: AzureImageTagNode | DockerHubImageTagNode): Promise<void> {
  assert(!!node, "Should not be available through command palette");

  let azureAccount = await AzureUtilityManager.getInstance().requireAzureAccount();
  const azureAccountWrapper = new AzureAccountWrapper(ext.context, azureAccount);
  const wizard = new WebAppCreator(ext.outputChannel, azureAccountWrapper, node);
  const result = await wizard.run();
  if (result.status === 'Faulted') {
    throw result.error;
  } else if (result.status === 'Cancelled') {
    throw new UserCancelledError();
  }
  const website = wizard.createdWebSite;

  if (context instanceof AzureImageTagNode) {
    const publishingCredentials: User = await getWebAppPublishCredential(wizard.azureAccount, context.subscription, website);
    await createWebhookForWebApp(context, wizard, publishingCredentials.scmUri);

  } else {
    // point to dockerhub to create a webhook
    // http://cloud.docker.com/repository/docker/<registryName>/<repoName>/webHooks
    const dockerhubPrompt: string = "Copy web app endpoint and browse to dockerhub";
    let response: string = await vscode.window.showInformationMessage("Please browse to your dockerhub account to set up a CI/CD webhook", dockerhubPrompt);
    if (response) {
      let appUri = `https://${website.name}.scm.azurewebsites.net/docker/hook`;
      // tslint:disable-next-line:no-unsafe-any
      clipboardy.writeSync(appUri);
      // tslint:disable-next-line:no-unsafe-any
      vscode.env.openExternal(vscode.Uri.parse(`https://cloud.docker.com/repository/docker/${context.userName}/${context.repositoryName}/webHooks`));
    }
  }
  return;
}

async function createWebhookForWebApp(context: AzureImageTagNode, wizard: WebAppCreator, appUri: string): Promise<void> {
  //create webhook
  const crmClient: ContainerRegistryManagementClient = await AzureUtilityManager.getInstance().getContainerRegistryManagementClient(context.subscription);
  let resourceGroup: ResourceGroup = (<ResourceGroupStep>wizard.findStep(step => step instanceof ResourceGroupStep, "Resource Group step not executed")).resourceGroup;
  let websiteStep: WebsiteStep = (<WebsiteStep>wizard.findStep(step => step instanceof WebsiteStep, ""));
  let registryName: string = websiteStep.registry.name;
  let webhookName: string = `webapp${websiteStep.website.name}`;

  //verify that the appropriate webhook doesn't already exist
  if ((await crmClient.webhooks.list(resourceGroup.name, registryName)).find((hook) => hook.name === webhookName)) {
    return;
  }

  const registryList = await crmClient.registries.list();
  const registryHandle = registryList.find((value) => value.name === websiteStep.registry.name);
  let webhookLocation: string = registryHandle.location;

  let webhookCreateParameters: WebhookCreateParameters = {
    location: webhookLocation,
    serviceUri: appUri,
    scope: AzureImageTagNode.getImageNameWithTag(context.repositoryName, context.tag),
    actions: ["push"],
    status: 'enabled'
  };
  const webhook = await crmClient.webhooks.create(resourceGroup.name, registryName, webhookName, webhookCreateParameters);
  ext.outputChannel.appendLine(`Created webhook ${webhook.name} with tag ${webhook.tags}, id: ${webhook.id}`);

}

// Remove this when https://github.com/Microsoft/vscode-docker/issues/445 fixed
function registerCommand(
  commandId: string,
  // tslint:disable-next-line: no-any
  callback: (context: IActionContext, ...args: any[]) => any
): void {
  return uiRegisterCommand(
    commandId,
    // tslint:disable-next-line: no-any
    async (context: IActionContext, ...args: any[]) => {
      if (args.length) {
        let properties: {
          contextValue?: string;
        } & TelemetryProperties = context.telemetry.properties;
        const contextArg = args[0];

        if (contextArg instanceof NodeBase) {
          properties.contextValue = contextArg.contextValue;
        } else if (contextArg instanceof vscode.Uri) {
          properties.contextValue = "Uri";
        }
      }

      return callback(context, ...args);
    }
  );
}

// tslint:disable-next-line:max-func-body-length
function registerDockerCommands(): void {
  ext.dockerExplorerProvider = new DockerExplorerProvider();
  vscode.window.registerTreeDataProvider(
    'dockerExplorer',
    ext.dockerExplorerProvider
  );

  registerCommand('vscode-docker.images.selectGroupBy', selectGroupImagesBy);

  registerCommand('vscode-docker.acr.createRegistry', createAzureRegistry);
  registerCommand('vscode-docker.acr.deleteImage', deleteAzureImage);
  registerCommand('vscode-docker.acr.deleteRegistry', deleteAzureRegistry);
  registerCommand('vscode-docker.acr.deleteRepository', deleteAzureRepository);
  registerCommand('vscode-docker.acr.pullImage', pullAzureImage);
  registerCommand('vscode-docker.acr.pullRepo', pullAzureRepository);
  registerCommand('vscode-docker.acr.quickBuild', runAzureQuickBuild);
  registerCommand('vscode-docker.acr.runTask', runAzureTask);
  registerCommand("vscode-docker.acr.runTaskFile", runAzureTaskFromFile);
  registerCommand('vscode-docker.acr.showTask', showAzureTaskProperties);
  registerCommand('vscode-docker.acr.untagImage', untagAzureImage);
  registerCommand('vscode-docker.acr.viewLogs', viewAzureLogs);

  registerCommand('vscode-docker.api.configure', configureApi);
  registerCommand('vscode-docker.browseDockerHub', browseDockerHub);
  registerCommand('vscode-docker.browseAzurePortal', browseAzurePortal);

  registerCommand('vscode-docker.compose.down', composeDown);
  registerCommand('vscode-docker.compose.restart', composeRestart);
  registerCommand('vscode-docker.compose.up', composeUp);
  registerCommand('vscode-docker.configure', configure);
  registerCommand('vscode-docker.connectCustomRegistry', connectCustomRegistry);

  registerCommand('vscode-docker.container.open-shell', openShellContainer);
  registerCommand('vscode-docker.container.remove', removeContainer);
  registerCommand('vscode-docker.container.restart', restartContainer);
  registerCommand('vscode-docker.container.show-logs', showLogsContainer);
  registerCommand('vscode-docker.container.start', startContainer);
  registerCommand('vscode-docker.container.start.azurecli', startAzureCLI);
  registerCommand('vscode-docker.container.start.interactive', startContainerInteractive);
  registerCommand('vscode-docker.container.stop', stopContainer);

  registerCommand('vscode-docker.createWebApp', createWebApp);
  registerCommand('vscode-docker.disconnectCustomRegistry', disconnectCustomRegistry);
  registerCommand('vscode-docker.dockerHubLogout', dockerHubLogout);
  registerCommand('vscode-docker.dockerHubLogin', dockerHubLogin);
  registerCommand('vscode-docker.explorer.refresh', () => ext.dockerExplorerProvider.refresh());

  registerCommand('vscode-docker.image.build', buildImage);
  registerCommand('vscode-docker.image.inspect', inspectImage);
  registerCommand('vscode-docker.image.push', pushImage);
  registerCommand('vscode-docker.image.remove', removeImage);
  registerCommand('vscode-docker.image.tag', tagImage);

  registerCommand('vscode-docker.setRegistryAsDefault', setRegistryAsDefault);
  registerCommand('vscode-docker.system.prune', systemPrune);
}

export async function deactivateInternal(): Promise<void> {
  if (!client) {
    return undefined;
  }
  // perform cleanup
  Configuration.dispose();
  return await client.stop();
}

namespace Configuration {
  let configurationListener: vscode.Disposable;

  export function computeConfiguration(params: ConfigurationParams): vscode.WorkspaceConfiguration[] {
    let result: vscode.WorkspaceConfiguration[] = [];
    for (let item of params.items) {
      let config: vscode.WorkspaceConfiguration;

      if (item.scopeUri) {
        config = vscode.workspace.getConfiguration(
          item.section,
          client.protocol2CodeConverter.asUri(item.scopeUri)
        );
      } else {
        config = vscode.workspace.getConfiguration(item.section);
      }
      result.push(config);
    }
    return result;
  }

  export function initialize(): void {
    configurationListener = vscode.workspace.onDidChangeConfiguration(
      (e: vscode.ConfigurationChangeEvent) => {
        // notify the language server that settings have change
        client.sendNotification(DidChangeConfigurationNotification.type, {
          settings: null
        });

        // Update endpoint and refresh explorer if needed
        if (e.affectsConfiguration('docker')) {
          docker.refreshEndpoint();
          // tslint:disable-next-line: no-floating-promises
          setRequestDefaults();
          readImageGrouping();
          vscode.commands.executeCommand('vscode-docker.explorer.refresh');
        }
      }
    );
  }

  export function dispose(): void {
    if (configurationListener) {
      // remove this listener when disposed
      configurationListener.dispose();
    }
  }
}

function activateLanguageClient(): void {
  // Don't wait
  callWithTelemetryAndErrorHandling('docker.languageclient.activate', async (context: IActionContext) => {
    context.telemetry.properties.isActivationEvent = 'true';
    let serverModule = ext.context.asAbsolutePath(
      path.join(
        ignoreBundle ? "node_modules" : "dist",
        "dockerfile-language-server-nodejs",
        "lib",
        "server.js"
      )
    );
    assert(true === await fse.pathExists(serverModule), "Could not find language client module");

    let debugOptions = { execArgv: ["--nolazy", "--inspect=6009"] };

    let serverOptions: ServerOptions = {
      run: {
        module: serverModule,
        transport: TransportKind.ipc,
        args: ["--node-ipc"]
      },
      debug: {
        module: serverModule,
        transport: TransportKind.ipc,
        options: debugOptions
      }
    };

    let middleware: Middleware = {
      workspace: {
        configuration: Configuration.computeConfiguration
      }
    };

    let clientOptions: LanguageClientOptions = {
      documentSelector: DOCUMENT_SELECTOR,
      synchronize: {
        fileEvents: vscode.workspace.createFileSystemWatcher("**/.clientrc")
      },
      middleware: middleware
    };

    client = new LanguageClient(
      "dockerfile-langserver",
      "Dockerfile Language Server",
      serverOptions,
      clientOptions
    );
    // tslint:disable-next-line:no-floating-promises
    client.onReady().then(() => {
      // attach the VS Code settings listener
      Configuration.initialize();
    });
    client.start();
  });
}

function readImageGrouping(): void {
  const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(configPrefix);
  let imageGrouping: string | undefined = configOptions.get<string>(configurationKeys.groupImagesBy);
  ext.groupImagesBy = imageGrouping && imageGrouping in ImageGrouping ? <ImageGrouping>ImageGrouping[imageGrouping] : DefaultImageGrouping;
}

async function selectGroupImagesBy(): Promise<void> {
  let response = await ext.ui.showQuickPick(
    [
      { label: "No grouping", data: ImageGrouping.None },
      { label: "Group by repository", data: ImageGrouping.Repository },
      { label: "Group by repository name", data: ImageGrouping.RepositoryName },
      { label: "Group by image ID", data: ImageGrouping.ImageId },
    ],
    {
      placeHolder: "Select how to group the Images node entries"
    });

  groupImagesBy(response.data);
}

function groupImagesBy(groupBy: ImageGrouping): void {
  ext.groupImagesBy = groupBy;
  const configOptions: vscode.WorkspaceConfiguration = vscode.workspace.getConfiguration(configPrefix);
  configOptions.update(configurationKeys.groupImagesBy, ImageGrouping[ext.groupImagesBy], vscode.ConfigurationTarget.Global);
  ext.dockerExplorerProvider.refreshImages();
}
