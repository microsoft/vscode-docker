# Docker Support for Visual Studio Code

[![Version](https://vsmarketplacebadge.apphb.com/version/ms-azuretools.vscode-docker.svg)](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) [![Installs](https://vsmarketplacebadge.apphb.com/installs-short/ms-azuretools.vscode-docker.svg)](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) [![Build Status](https://dev.azure.com/ms-azuretools/AzCode/_apis/build/status/vscode-docker)](https://dev.azure.com/ms-azuretools/AzCode/_build/latest?definitionId=8)

The Docker extension makes it easy to build, manage and deploy containerized applications from Visual Studio Code, for example:

* Automatic `Dockerfile`, `docker-compose.yml`, and `.dockerignore` file generation (Press `F1` and search for `Docker: Add Docker files to Workspace`)
* Syntax highlighting, hover tips, IntelliSense (completions) for `docker-compose.yml` and `Dockerfile` files
* Linting (errors and warnings) for `Dockerfile` files
* Command Palette (`F1`) integration for the most common Docker commands (for example `docker build`, `docker push`, etc.)
* Explorer integration for managing Images, running Containers, and Docker Hub registries
* Deploy images from Docker Hub and Azure Container Registries directly to Azure App Service
* [Debug .NET Core applications](https://github.com/microsoft/vscode-docker/wiki/Debug-.NET-Core-(Preview)) running in Linux Docker containers
* [Working with docker](https://code.visualstudio.com/docs/azure/docker) will walk you through many of the features of this extension

**Visit the [wiki](https://github.com/Microsoft/vscode-docker/wiki) for additional information about the extension.**

## Prerequisites

To use much of the Docker extension functionality, you will need to [install Docker](https://aka.ms/AA37qtj) on your machine and set up on the system path.

### Linux

Since VS Code runs as a non-root user, you will also need to follow the steps in “Manage Docker as a non-root user” from [Post-installation steps for Linux](https://aka.ms/AA37yk6) for the extension to be able to access docker.

## Generating Docker Files

Press `F1` and search for `Docker: Add Docker Files to Workspace` to generate `Dockerfile`, `docker-compose.yml`, `docker-compose.debug.yml`, and `.dockerignore` files for your workspace type:

![dockerfile](images/generateFiles.gif)

> Note: The `docker-compose.yml` and `docker-compose.debug.yml` files are not generated for .NET Core applications.

## Editing

Rich IntelliSense (completions) for `Dockerfile` and `docker-compose.yml` files:

![IntelliSense for DockerFiles](images/intelliSense.gif)

## Docker commands

Many of the most common Docker and docker compose commands are built right into the Command Palette (`F1`).

![IntelliSense](images/commands.gif)

## Docker View

The Docker extension contributes a new `Docker` View to VS Code. Within the View, the Explorer lets you view and manage your Images, Containers, and browse your Docker Hub registry. If the [Azure Account](https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account) extension is installed, you can browse your [Azure Container Registries](https://docs.microsoft.com/en-us/azure/container-registry/) as well.

The right click context menu provides quick access to the same rich set of commands found in the Command Palette (`F1`).

![explorer integration](images/explorer.png)

You can move the View up or down by dragging the Docker icon and you can hide the View by right clicking on the icon and choosing `Hide`. To bring it back, right click on the Activity Bar area and check the `Docker` item.

![show and hide the view](images/viewRightClick.png)

The `showExplorer` configuration setting controls the visibility of the Docker View.

``` json
"docker.showExplorer": false
```

## Docker Hub Login

The first time you expand the Docker Hub node you'll be prompted to log in to your Docker Hub account.

![Docker Hub Login](images/dockerHubLogin.gif)

Your user name and password are stored in your operating system credentials vault (for example macOS keychain, Windows Credential Store) so that you don't need to log in every time. You can log out of Docker Hub by right clicking on the Docker Hub label and choosing log out. This will delete the credentials from the OS store.

## Deploying images to Azure App Service

With the Docker Explorer you can deploy images from Docker Hub Registries or Azure Container Registries directly to an Azure App Service instance, as detailed in this [getting started](https://code.visualstudio.com/tutorials/docker-extension/getting-started) guide. This functionality requires installing the [Azure Account](https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account) extension and an Azure Subscription. If you do not have an Azure subscription, [sign up today](https://azure.microsoft.com/en-us/free/?b=16.48) for a free 30 day account and get $200 in Azure Credits to try out any combination of Azure services.

To log into Azure, press `F1` and search for `Azure Sign In`. You will then sign into your account using the Device Login flow. Click on "Copy & Open" to open your default browser.

![Azure Login](images/devicelogin.png)

Paste in the access code and continue the sign in process.

![Azure Login](images/devicelogin2.png)

You can now right click on an image in Docker Hub or an Azure Container Registry and choose "Deploy Image to Azure App Service".

![Deploy to Azure](images/deploytoazure.png)

From here you will be prompted for a Resource Group, location, an App Service Plan, and a globally unique website name.

## Azure CLI

Microsoft ships the latest [Azure CLI](https://github.com/azure/azure-cli) as a [Docker image](https://hub.docker.com/r/azuresdk/azure-cli-python/). You can easily launch a container running the CLI from the Command Palette (press F1 and search for `Docker: Azure CLI`). The extension will then run an interactive terminal attached to the container.

After the container is started, you will be prompted to login to your Azure account. From there, set the subscription you want to work with using `az account set` (you can see all of your subscriptions with `az account list`). You do not need to login in every time you run the container because the extension volume mounts the local `$HOME/.azure` folder to the container's `$HOME/.azure` folder.

## Connecting to `docker-machine`

The default connection of the extension is to connect to the local docker daemon. You can connect to a docker-machine instance if you launch Visual Studio Code and have the DOCKER_HOST environment variable set to a valid host or if you set the `docker.host` configuration setting.

If the docker daemon is using TLS, the DOCKER_CERT_PATH environment variable must also be set (e.g. `$HOME\.docker\machine\machines\default`). See [docker documentation](https://docs.docker.com/machine/reference/env/) for more information.

## Workaround for VS Code remote development

If you are running the extension via VS Code remote development, you will have to configure the remote instance (WSL, SSH machine, dev container) to run docker commands smoothly (like `docker run hello world`). First, install docker-cli in the remote instance.

In Windows subsystem for linux (WSL), you have to set the `DOCKER_HOST` environment variable in linux to connect to Docker for Windows. See [here](https://nickjanetakis.com/blog/setting-up-docker-for-windows-and-wsl-to-work-flawlessly) for more detailed instructions.

In SSH, the setup for docker is dependent on the machine environment.

There can be issues running the docker daemon from _inside the dev container_ (also called docker-in-docker). On the first build of the container, you might encounter an error about connecting to Docker. Follow [these docker-in-docker instructions](https://github.com/Microsoft/vscode-dev-containers/tree/master/containers/docker-in-docker) to set up your dev container docker daemon, and the extension experience will mirror working on a local workspace.

## Contributing

There are a couple of ways you can contribute to this repo:

* **Ideas, feature requests and bugs**: We are open to all ideas and we want to get rid of bugs! Use the Issues section to either report a new issue, provide your ideas or contribute to existing threads.
* **Documentation**: Found a typo or strangely worded sentences? Submit a PR!
* **Code**: Contribute bug fixes, features or design changes:
  * Clone the repository locally and open in VS Code.
  * Install [TSLint for Visual Studio Code](https://marketplace.visualstudio.com/items?itemName=ms-vscode.vscode-typescript-tslint-plugin).
  * Open the terminal (press `CTRL+`\`) and run `npm install`.
  * To build, press `F1` and type in `Tasks: Run Build Task`.
  * Debug: press `F5` to start debugging the extension.

### Legal

Before we can accept your pull request you will need to sign a **Contribution License Agreement**. All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

### Code of Conduct

This project has adopted the [Microsoft Open Source Code of Conduct](https://opensource.microsoft.com/codeofconduct/). For more information see the [Code of Conduct FAQ](https://opensource.microsoft.com/codeofconduct/faq/) or contact [opencode@microsoft.com](mailto:opencode@microsoft.com) with any additional questions or comments.

## Telemetry

VS Code collects usage data and sends it to Microsoft to help improve our products and services. Read our [privacy statement](https://go.microsoft.com/fwlink/?LinkID=528096&clcid=0x409) to learn more. If you don’t wish to send usage data to Microsoft, you can set the `telemetry.enableTelemetry` setting to `false`. Learn more in our [FAQ](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).

## License

[MIT](LICENSE.md)
