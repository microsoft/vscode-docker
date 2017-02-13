# Docker Support for Visual Studio Code
The Docker extension makes it easy to build and deploy containerized applications from Visual Studio Code. 

* Automatic dockerfile and docker-compose.yml file generation 
* Syntax highlighting and hover tips for docker-compose.yml and dockerfile files
* Snippets for dockerfile files
* IntelliSense (completions) on image names from Dockerhub.com
* Linting (errors and warnings) for dockerfile files
* Command Palette (F1) integration for the most common Docker commands (e.g. Build, Push)
* Deploy images to the cloud by running the [Azure CLI](https://github.com/azure/azure-cli) in a container 

## Generating Dockerfile, docker-compose.yml, and docker-compose.debug.yml
![dockerfile](images/generateFiles.gif)

IntelliSense (completions) for Dockerfile and docker-compose.yml files, including listing images from Dockerhub.com.

![intelliSense](images/intelliSense.gif)

## Docker commands
Many of the most common Docker and docker-compose commands are built right into the Command Palette (F1).

![intelliSense](images/commands.gif)

## Dockerfile linting
You can enable linting of Dockerfile files through the `docker.enableLinting` setting (CMD+, on MacOS, or Ctrl+, on Windows and Linux). The extension uses the awesome [dockerfile_lint](https://github.com/projectatomic/dockerfile_lint) rules based linter to analyze the Dockerfile. You can provide your own customized rules file by setting the `docker.linterRuleFile` setting. You can find [more information](https://github.com/projectatomic/dockerfile_lint#extending-and-customizing-rule-files) on how to create rules files as well as [sample rules files](https://github.com/projectatomic/dockerfile_lint/tree/master/sample_rules) in the [dockerfile_lint](https://github.com/projectatomic/dockerfile_lint) project. 

![linting](images/linting.gif)

## Installation
In VS Code, press F1 and type in `ext install vscode-docker`. Once the extension is installed you will be prompted to restart Visual Studio Code which will only take (literally) a couple of seconds. 

Of course, you will want to have Docker installed on your computer in order to run commands from the Command Palette (F1, type in `Docker`).  

## Running commands on Linux
By default, Docker runs as the root user, requiring other users to access it with `sudo`. This extension does not assume root access, so you will need to create a Unix group called docker and add users to it. Instructions can be found here: [Create a Docker group](https://docs.docker.com/engine/installation/linux/ubuntulinux/#/create-a-docker-group)

## Azure CLI
Microsoft ships the latest [Azure CLI](https://github.com/azure/azure-cli) as a [Docker image](https://hub.docker.com/r/azuresdk/azure-cli-python/). You can easily launch a container running the CLI from the Command Palette (press F1 and search for `Docker: Azure CLI`). The extension will then run an interactive terminal attached to the container. 

After the container is started, you will be prompted to login to your Azure account. From there, set the subscription you want to work with using `az account set` (you can see all of your subscriptions with `az account list`). 

> If you do not have an Azure subscription, [sign up today](https://azure.microsoft.com/en-us/free/?b=16.48) for a **free** 30 day account and get **$200** in Azure Credits to try out any combination of Azure services.


## Contributing
There are a couple of ways you can contribute to this repo:

- Ideas, feature requests and bugs: We are open to all ideas and we want to get rid of bugs! Use the Issues section to either report a new issue, provide your ideas or contribute to existing threads
- Documentation: Found a typo or strangely worded sentences? Submit a PR!
- Code: Contribute bug fixes, features or design changes.

## Legal
Before we can accept your pull request you will need to sign a **Contribution License Agreement**. All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

## License 
[MIT](LICENSE)
