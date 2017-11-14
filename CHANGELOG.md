## 0.0.22 - 13 Nov 2017

* Make shell commands configurable (thanks @FredrikFolkesson) [#160](https://github.com/Microsoft/vscode-docker/pull/160)
* Update usage of Azure Account API to speed up deployment to Azure App Services
* Set CD App Setting when deploying image from Azure Container Registry

## 0.0.21 - 08 Nov 2017

* Update `docker-compose.debug.yml` command to include full the URI to the debug port (fix for [vscode: 36192](https://github.com/Microsoft/vscode/issues/36192))
* Filter the subscriptions presented when deploying to Azure based on the Azure Account subscription filter
* Mark as multi-root ready
* Fix debug configuration generation [VSCode #37648](https://github.com/Microsoft/vscode/issues/37648)
* Add `restart` command for containers (thanks @orfevr) [#152](https://github.com/Microsoft/vscode-docker/pull/152)
* Less aggressive matching for `dockerfile` (thanks @dlech) [#155](https://github.com/Microsoft/vscode-docker/pull/155)
* Support workspace folders for language server settings (thanks @rcjsuen) [#156](https://github.com/Microsoft/vscode-docker/pull/156)
* Add config option for docker build path (thanks @nyamakawa) [#158](https://github.com/Microsoft/vscode-docker/pull/158)

## 0.0.20 - 18 Oct 2017

* No longer take a hard dependency on the [Azure Account](https://marketplace.visualstudio.com/items?itemName=ms-vscode.azure-account) extension.

## 0.0.19 - 14 Oct 2017

* Add an automatic refresh option for the explorer (`"docker.explorerRefreshInterval": 1000`)
* Add support for Multi-Root Workspaces
* Add support for browsing DockerHub and Azure Container Registries
* Add support for deploying images from DockerHub and Azure Container Registries to Azure App Service
* `docker-compose` now runs detached and always invokes a build (e.g. `docker-compose -f docker-compose.yml -d --build`)
* `docker system prune` command no longer prompts for confirmation
* `docker-compose.debuy.yml` no longer contains a volume mapping
* Adopt 0.0.9 release of the [Docker Language Server](https://github.com/rcjsuen/dockerfile-language-server-nodejs)

## 0.0.18 - 18 Sept 2017

* Add configuration option (`"docker.showExplorer": false`) to globally turn off or on the Explorer contribution
* Prompt for confirmation when running `docker system prune` command, improve icon

## 0.0.17 - 16 Sept 2017

* Add `docker inspect` command
* Gracefully handle when Docker is not running
* Add Explorer contribution, letting you view Images and Containers in the Explorer viewlet.
* Add `--rm` to `docker build` to remove intermediate images
* Thanks to @rcjsuen, moved to the [Dockerfile Language Server](https://github.com/rcjsuen/dockerfile-language-server-nodejs) 
* Update thirdpartynotices.txt, README.md to reflect changes

## 0.0.16 - 09 June 2017

* Update snippet syntax to be in accordance with the [stricter snippet syntax](https://code.visualstudio.com/updates/v1_13#_strict-snippets)
* Moved source code to support async/await (important if you want to make PRs!)

## 0.0.15 - 25 May 2017

* Updated both the `Docker: Run` and `Docker: Run Interactive` commands to automatically publish the ports that the specified image exposes
* Updated the `Docker: Run` command to run the specified container in the background
* Updated the `Docker: Add docker files to workspace` command to generate a `.dockerignore` file
* Updated the `Docker: Azure CLI` command to fully support running `az acs` commands

## 0.0.14 - 08 May 2017
* Support for Docker multi stage build Dockerfiles (syntax, linting)
* Support different variations on naming of `dockerfile` such as `dockerfile-development`
* Bug fixing

## 0.0.13 - 14 March 2017
* Support for `.yaml` file extension on `docker-compose` files. 
* Updated Azure CLI image name, map .azure folder from host file system, fix block running on Windowns containers, fix Windows path issues (this didn't make it into `0.0.12`)
* Added telemetry to understand which commands developers find useful. This will help us refine which commands we add in the future. We track whether the following commands are executed:
  * `build image`
  * `compose up`, `compose down`
  * `open shell` on running container and whether or not it is a Windows or Linux based container
  * `push image` (we don't track the image name or the location)
  * `remove image`
  * `show logs`
  * `start container`, `start container interactive`
  * `start Azure CLI` container
  * `stop container`
  * `system prune`
  * `tag` (we don't track tag name)
  * Configure workspace along with the type (e.g. Node or Other)

> Please note, you can turn off telemetry reporting for VS Code and all extensions through the ["telemetry.enableTelemetry": false setting](https://code.visualstudio.com/docs/supporting/faq#_how-to-disable-telemetry-reporting).


## 0.0.12 - 11 February 2017

* Removed `MAINTAINER` from templates and linting warnings by upgrading the `dockerfile_lint` module (Docker has deprecated `MAINTAINER` in favor of `LABEL`).
* Added command to run `docker system prune`, note we use the `-f` (force) flag to ignore the confirmation prompt.
* `Docker: Attach Shell` command now supports Windows containers [#58](https://github.com/microsoft/vscode-docker/pull/58).

## 0.0.10 - 12 December 2016

* Added context menu support to run the Docker Build command on Dockerfile files from the editor or from the explorer.
* Docker logs now uses the -f flag ([follow](https://docs.docker.com/engine/reference/commandline/logs/)) to continue streaming the logs to terminal. 

## 0.0.11 - 4 January 2017

* Fixed [Issue 51](https://github.com/microsoft/vscode-docker/issues/51), a path problem on Windows.