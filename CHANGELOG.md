## 1.22.0 - 18 April 2022
### Added
* Added a setting, `docker.composeCommand`, to allow configuring the command used for Compose operations. If unset, the extension will attempt to automatically detect whether to use `docker compose` or `docker-compose`. [#2977](https://github.com/microsoft/vscode-docker/issues/2977)
* In Python projects, the `.venv` directory is now added to the `.dockerignore` file, so it will no longer be part of the `docker build` context. [#3476](https://github.com/microsoft/vscode-docker/issues/3476)
* A "Copy Full Tag" command has been added for images in the Registries view. [#3481](https://github.com/microsoft/vscode-docker/pull/3481)

## 1.21.0 - 21 March 2022
### Added
* Added the `projectName` option to `docker-compose` tasks, corresponding to `--project-name`. [#3436](https://github.com/microsoft/vscode-docker/issues/3436)
* Support for the `options.env` and `options.cwd` options on all task types. [#3437](https://github.com/microsoft/vscode-docker/issues/3437)
* Support for the `${userHome}` task variable on all task types. [#3455](https://github.com/microsoft/vscode-docker/pull/3455)

## 1.20.0 - 22 February 2022
### Added
* The "Compose Start" and "Compose Stop" commands available in the explorer context menu will now also be available in the command palette. [#3140](https://github.com/microsoft/vscode-docker/issues/3140)

### Fixed
* Flask apps will now use port 5002 by default, and .NET apps will use the semi-random port scaffolded in the `launchSettings.json` file. This will avoid conflicting with port 5000 which is often in-use on Mac. [#3381](https://github.com/microsoft/vscode-docker/issues/3381)
* Fixed an issue in the container files explorer on Windows containers with other localizations. [#3415](https://github.com/microsoft/vscode-docker/pull/3415)
* The experience for adding Dockerfiles to Django projects has been improved slightly. [#3410](https://github.com/microsoft/vscode-docker/issues/3410)

## 1.19.0 - 17 January 2022
### Added
* For volume mappings in `docker-run` tasks, the `ro,z` and `rw,z` permissions have been added, allowing support for SELinux systems. [#3289](https://github.com/microsoft/vscode-docker/pull/3289)

### Fixed
* `docker-run` and `docker-build` tasks will now respect the `docker.dockerPath` setting. [#3281](https://github.com/microsoft/vscode-docker/issues/3281)
* Several fixes and enhancements to the Compose language service have been made. [#78](https://github.com/microsoft/compose-language-service/issues/78), [#70](https://github.com/microsoft/compose-language-service/issues/70), [#69](https://github.com/microsoft/compose-language-service/issues/69), [#68](https://github.com/microsoft/compose-language-service/issues/68), [#65](https://github.com/microsoft/compose-language-service/issues/65)
* For .NET projects, the `/p:UseAppHost=false` argument is added to the `dotnet publish` command line, in order to prevent a duplicate executable file being created and bloating image size. [#3371](https://github.com/microsoft/vscode-docker/issues/3371)
* The `envFiles` option in `docker-compose` tasks has been replaced with `envFile`, as only one is actually allowed. [#3339](https://github.com/microsoft/vscode-docker/pull/3339)

## 1.18.0 - 15 November 2021
### Added
* Substantial additions (to completions especially) have been made to the Compose language service. It now has near-parity to the previously-available features. [#3222](https://github.com/microsoft/vscode-docker/issues/3222)
* The Compose language service has been turned on by default. [#3288](https://github.com/microsoft/vscode-docker/pull/3288)
* The walkthrough with the [VSCode walkthrough experience](https://code.visualstudio.com/updates/v1_57#_new-getting-started-experience) is no longer an experiment and is visible to all users. The previous "Getting Started" page has been removed. [#3055](https://github.com/microsoft/vscode-docker/issues/3055), [#3248](https://github.com/microsoft/vscode-docker/pull/3248)
* A command to show `docker stats` in the terminal has been added. [#3063](https://github.com/microsoft/vscode-docker/issues/3063)

### Fixed
* A few small improvements have been made to the walkthrough. [#3223](https://github.com/microsoft/vscode-docker/issues/3223), [#3235](https://github.com/microsoft/vscode-docker/issues/3235)
* Azure Arc custom locations should now show up again in the location selection list. [#3213](https://github.com/microsoft/vscode-docker/issues/3213)
* A fix has been made to an infinite loop error in the Dockerfile language service. [#3268](https://github.com/microsoft/vscode-docker/issues/3268)

## 1.17.0 - 20 September 2021
### Added
* Docker Context lookup at the time of extension activation will now always try using the gRPC API first, due to superior performance. Previously this was an experiment. [#3157](https://github.com/microsoft/vscode-docker/pull/3157)

### Fixed
* "Invalid JSON response body" on certain registry connections. [#3185](https://github.com/microsoft/vscode-docker/issues/3185)
* Explorer view would appear to load forever if Docker was not installed. [#3132](https://github.com/microsoft/vscode-docker/issues/3132)

### Removed
* The "Report Issue" button has been removed from error toasts. Instead, you can use the command "Docker: Report Issue". [#3127](https://github.com/microsoft/vscode-docker/issues/3127)
* Since it is now end-of-life, code specific to .NET Core 2.1 has been removed. [#3093](https://github.com/microsoft/vscode-docker/issues/3093)

### Experiments (may not be visible to all users)
* A walkthrough has been added using the new [VSCode walkthrough experience](https://code.visualstudio.com/updates/v1_57#_new-getting-started-experience), replacing the Docker start page. [#3055](https://github.com/microsoft/vscode-docker/issues/3055)

## 1.16.1 - 1 September 2021
### Fixed
* Node debugging does not work in VS Code 1.60.0 due to removal of `node2` debug type. [#3177](https://github.com/microsoft/vscode-docker/issues/3177)

## 1.16.0 - 16 August 2021
### Added
* VSCode's [Workspace Trust](https://code.visualstudio.com/updates/v1_57#_workspace-trust) feature is now supported. [#2829](https://github.com/microsoft/vscode-docker/issues/2829)
* The Dockerfile scaffolding for Node.js applications now will use the low-rights `node` user by default. [#1834](https://github.com/microsoft/vscode-docker/issues/1834)
* Profiles are now supported for starting applications with "Compose Up - Select Services" and in `docker-compose` tasks. [#2777](https://github.com/microsoft/vscode-docker/issues/2777)
* In compose project groupings in the Containers view, Start and Stop are now available. [#2895](https://github.com/microsoft/vscode-docker/issues/2895)

### Fixed
* Organizations should now show up in the Registries view for Docker Hub accounts. [#2954](https://github.com/microsoft/vscode-docker/issues/2954)
* Improvements have been made to extension activation time on Windows and Mac. [#3054](https://github.com/microsoft/vscode-docker/issues/3054)

## 1.15.0 - 19 July 2021
### Fixed
* Use correct base image for .NET Windows containers [#3018](https://github.com/microsoft/vscode-docker/issues/3018)
* Fix installation of Docker on ARM64 Mac machines [#3024](https://github.com/microsoft/vscode-docker/issues/3024)
* Start page icons now display correctly [#2952](https://github.com/microsoft/vscode-docker/issues/2952)
* Eliminate spurious errors when images are deleted from Azure Container Registry [#2968](https://github.com/microsoft/vscode-docker/issues/2968)
* Enable deployment to App Service that uses "custom location" (Kubernetes-hosted) [#2972](https://github.com/microsoft/vscode-docker/issues/2972), [#2973](https://github.com/microsoft/vscode-docker/issues/2973)

## 1.14.0 - 21 June 2021
### Added
* Enable Dockerfile formatter to skip instructions that span multiple lines [#992](https://github.com/microsoft/vscode-docker/issues/992), [#2004](https://github.com/microsoft/vscode-docker/issues/2004)
* Add ability to see dangling images in the explorer [#2547](https://github.com/microsoft/vscode-docker/issues/2547)
* Add a setting for Docker CLI executable path, providing a workaround for [#2894](https://github.com/microsoft/vscode-docker/issues/2894)
* Enable debugging .NET applications in arm64 containers [#2884](https://github.com/microsoft/vscode-docker/issues/2884)

### Fixed
* Docker start Page pops up for non-docker related activations [#2953](https://github.com/microsoft/vscode-docker/issues/2953)

## 1.13.0 - 25 May 2021
### Added
* Support for deploying a container image to Azure App Service on Kubernetes with Azure Arc. [#2924](https://github.com/microsoft/vscode-docker/pull/2924)
* Use fixed port for .Net in compose files. [#2725](https://github.com/microsoft/vscode-docker/issues/2725)
* Use latest version of dockerfile language server .NET apps will now scaffold using a non-root user. [#2865](https://github.com/microsoft/vscode-docker/issues/2865)

### Fixed
* "Open Folder" button not opening the folder in Mac. [#2846](https://github.com/microsoft/vscode-docker/issues/2846)
* Webview disposed error. [#2820](https://github.com/microsoft/vscode-docker/issues/2820)

## 1.12.1 - 12 April 2021
### Fixed
* Fixed C# extension not being recognized when adding Dockerfiles to a .NET project. [#2867](https://github.com/microsoft/vscode-docker/issues/2867)

## 1.12.0 - 12 April 2021
### Added
* The extension now targets Docker Compose commands to files matching the `dockercompose` language ID. This raises the minimum required VS Code version to 1.55.0. [#2761](https://github.com/microsoft/vscode-docker/issues/2761)
* .NET apps will now scaffold using a non-root user. [#1835](https://github.com/microsoft/vscode-docker/issues/1835)
* Deployments from Azure Container Registry to Azure App Service now no longer require the admin credentials enabled on the ACR. This will now use a system-assigned Managed Service Identity. [#1685](https://github.com/microsoft/vscode-docker/issues/1685)
* The "Docker Containers: Compose Logs" command can now be used from the palette, as long as the grouping in the containers panel is set to the default of "Compose Project Name". [#2770](https://github.com/microsoft/vscode-docker/issues/2770)
* The contexts panel now has a "Use" button directly in the tree item, saving a click. [#2719](https://github.com/microsoft/vscode-docker/issues/2719)

### Fixed
* ACI contexts should now work in sovereign clouds. [#2775](https://github.com/microsoft/vscode-docker/issues/2775)
* Better information on both Python and .NET Dockerfiles about running as a non-root user. [#2724](https://github.com/microsoft/vscode-docker/issues/2724)
* Generic registry auth will now try both `POST` and `GET` to obtain a token. [#2735](https://github.com/microsoft/vscode-docker/issues/2735)
* Commands launched on compose groups from the containers panel now use the compose project name. [#2755](https://github.com/microsoft/vscode-docker/issues/2755)
* Containers will now more reliably be removed after debugging when using the Restart option. [#2676](https://github.com/microsoft/vscode-docker/issues/2676)

## 1.11.0 - 15 March 2021
### Added
* Scaffolding and debugging for Python FastAPI is now added. Thanks @Kludex! [#2615](https://github.com/microsoft/vscode-docker/issues/2615)

### Fixed
* The use of keytar has been removed since VS Code now has a secret storage API. Users will need to log in to their registries again. [#2699](https://github.com/microsoft/vscode-docker/issues/2699)
* In the files explorer, folders containing spaces should work. [#2739](https://github.com/microsoft/vscode-docker/issues/2739)
* Adding Dockerfiles to a (ASP).NET app will now automatically generate the required .NET build task, using the C# extension. [#2669](https://github.com/microsoft/vscode-docker/issues/2669)
* Python `docker-run` tasks should now respect the `dockerRun` `command` option in tasks.json. [#2725](https://github.com/microsoft/vscode-docker/issues/2725)
* Microsoft Container Registry (MCR) images were sometimes incorrectly being flagged as out-of-date. [#2730](https://github.com/microsoft/vscode-docker/issues/2730)

## 1.10.0 - 15 February 2021
### Added
* Added tooltips to the various explorer views, which will show a great deal of helpful information. For example, the containers tooltips show connected volumes, networks, ports, and more. [#1002](https://github.com/microsoft/vscode-docker/issues/1002), [#2538](https://github.com/microsoft/vscode-docker/issues/2538), [#2592](https://github.com/microsoft/vscode-docker/issues/2592)
* Editing files in a running Linux container is now possible. [#2465](https://github.com/microsoft/vscode-docker/issues/2465)
* `COPY` and `ADD` statements in Dockerfiles now support the `--chmod` option. [#2624](https://github.com/microsoft/vscode-docker/issues/2624)
* In `docker-build` and `docker-run` tasks, the `docker.host` setting is now honored. [#2590](https://github.com/microsoft/vscode-docker/issues/2590)
* The preferred file name for Docker Compose files is now "compose.yaml". Scaffolding will still use "docker-compose.yml" for now, but "compose.yaml" files will be recognized as Compose files, allowing for right click -> Compose Up, etc. [#2618](https://github.com/microsoft/vscode-docker/issues/2618)
* Codicons are now used for almost all icons. [#2654](https://github.com/microsoft/vscode-docker/issues/2654)

### Fixed
* The previously available feature for checking if images are out of date has been re-enabled by default. The behavior now uses HEAD requests which are not subject to Docker Hub's rate limiting. This feature can be disabled with the setting `docker.images.checkForOutdatedImages`. [#2691](https://github.com/microsoft/vscode-docker/pull/2691)
* GitLab registry connection now supports--and requires--using personal access tokens. Users previously connecting with username and password will need to reconnect with a personal access token. Refer to the GitLab documentation on [creating personal access tokens](https://docs.gitlab.com/ee/user/profile/personal_access_tokens.html) for information on how to do so. [#1968](https://github.com/microsoft/vscode-docker/issues/1968), [#2688](https://github.com/microsoft/vscode-docker/issues/2688)
* Debugging Python apps in WSL should now work correctly. [#2641](https://github.com/microsoft/vscode-docker/issues/2641)
* On OS X Big Sur, `docker` was frequently missing from the `PATH` environment variable for unknown reasons. This issue should now be mitigated. [#2578](https://github.com/microsoft/vscode-docker/issues/2578)

### Experiments (may not be visible to all users)
* In context menus for Docker Compose files, a new option has been added to allow choosing a subset of the services in the Compose file to start--"Compose Up - Choose Services". This is equivalent to running the Compose Up command with the `${serviceList}` [magic property](https://code.visualstudio.com/docs/containers/reference#_docker-compose-up) in place. [#2646](https://github.com/microsoft/vscode-docker/issues/2646)

## 1.9.1 - 19 January 2021
### Fixed
* Debugging .NET and Python is now possible in GitHub Codespaces! [#2389](https://github.com/microsoft/vscode-docker/issues/2389), [#2565](https://github.com/microsoft/vscode-docker/issues/2565)
* Prompt to open a folder or workspace when executing commands that require one--instead of Report Issue button. [#2512](https://github.com/microsoft/vscode-docker/issues/2512)
* Fixed "object null is not iterable" error when scaffolding Dockerfiles for .NET apps. [#2572](https://github.com/microsoft/vscode-docker/issues/2572)
* Fixed some issues with understanding the state of containers in Azure Container Instances. [#2602](https://github.com/microsoft/vscode-docker/issues/2602)

## 1.9.0 - 16 December 2020
### Added
* View logs of Compose projects (cumulative logs of all containers belonging to a Compose run). [#2506](https://github.com/microsoft/vscode-docker/issues/2506)
* Show the Docker daemon host information in diagnostic output. [#2493](https://github.com/microsoft/vscode-docker/issues/2493)
* Support launching a subset of services from Compose file. [#2445](https://github.com/microsoft/vscode-docker/issues/2445)
* Allow users to download container files. [#2466](https://github.com/microsoft/vscode-docker/issues/2466)

### Fixed
* Directories in Windows containers cannot be browsed. [#2479](https://github.com/microsoft/vscode-docker/issues/2479)
* "Stop" action should only be shown for running containers. [#2497](https://github.com/microsoft/vscode-docker/issues/2497)
* Allow port selection when scaffolding Compose files for Node.js app. [#2495](https://github.com/microsoft/vscode-docker/issues/2495)
* Properly show image ID for container when requested. [#2507](https://github.com/microsoft/vscode-docker/issues/2507)

## 1.8.1 - 23 November 2020
### Fixed
* This update fixes an issue that prevented debugging Python applications in Docker containers. The latest version of the [Python extension](https://marketplace.visualstudio.com/items?itemName=ms-python.python) is also required. [#2455](https://github.com/microsoft/vscode-docker/issues/2455)
* Fixed an issue where the logo was hard to see in the [extension gallery page](https://marketplace.visualstudio.com/items?itemName=ms-azuretools.vscode-docker) in the browser. [#2499](https://github.com/microsoft/vscode-docker/issues/2499)

## 1.8.0 - 16 November 2020
### Added
* Added a read-only file explorer for running containers, this can be seen in the Docker Explorer tab. [#2333](https://github.com/microsoft/vscode-docker/issues/2333)
* In ACI contexts, volumes are now visible. [#2315](https://github.com/microsoft/vscode-docker/issues/2315)
* A start page will now open on install / upgrade with some pointers on where to begin. The automatic opening can be disabled with a checkbox on the page. [#1895](https://github.com/microsoft/vscode-docker/issues/1895)
* New extension icon! [#2475](https://github.com/microsoft/vscode-docker/pull/2475)

### Fixed
* Activation performance has been improved. [#2371](https://github.com/microsoft/vscode-docker/issues/2371)
* .NET Core image names below 5.0 can now be pulled without `/core`. The scaffolding code has been updated to reflect this. [#2429](https://github.com/microsoft/vscode-docker/issues/2429)
* Output looked bad for BuildKit builds. [#2451](https://github.com/microsoft/vscode-docker/issues/2451)

### Removed
* UI mode has been removed for the purposes of remoting, but it can be manually re-enabled. This change significantly improves the user experience when using remote features. [#2356](https://github.com/microsoft/vscode-docker/issues/2356)

## 1.7.0 - 19 October 2020
### Added
* The containers view is now grouped by compose project by default. This can be changed by settings. [#2324](https://github.com/microsoft/vscode-docker/issues/2324)
* On compose project grouping nodes, the commands "Compose Down" and "Compose Restart" can be used from context menu. [#2304](https://github.com/microsoft/vscode-docker/issues/2304)
* A `docker.context` setting is added, similar to `docker.host`, used for controlling the `DOCKER_CONTEXT` environment variable. [#2264](https://github.com/microsoft/vscode-docker/issues/2264)
* The checking for outdated images now applies to images from Microsoft Container Registry (MCR), including .NET and ASP.NET images. [#2165](https://github.com/microsoft/vscode-docker/issues/2165)
* The `docker-build` and `docker-run` tasks now have a `customOptions` flag, which can be used to add any arbitrary command line parameters to the `docker build` and `docker run` commands, respectively. [#2259](https://github.com/microsoft/vscode-docker/issues/2259), [#2271](https://github.com/microsoft/vscode-docker/issues/2271)

### Fixed
* The outdated image checking feature now will run at most once per day in order to conserve rate limits. The feature remains disabled by default but can be enabled in settings, with `docker.images.checkForOutdatedImages`. [#2272](https://github.com/microsoft/vscode-docker/issues/2272)
* Fixed an issue with Django project debugging not working on Linux. [#2313](https://github.com/microsoft/vscode-docker/issues/2313)
* Support for environment variables (like `${env:HOME}`) in launch configurations has been added. In general, any [variables](https://code.visualstudio.com/docs/editor/variables-reference) VS Code supports should work. [#1961](https://github.com/microsoft/vscode-docker/issues/1961)
* Node.js applications in subfolders should now be scaffolded correctly for building and debugging in Docker. [#2057](https://github.com/microsoft/vscode-docker/issues/2057)

### Removed
* The deprecated `docker-coreclr` debug configuration has been removed. It is replaced by the [`docker` debug configuration](https://code.visualstudio.com/docs/containers/debug-common). [#2197](https://github.com/microsoft/vscode-docker/issues/2197)

## 1.6.0 - 15 September 2020
### Added
* Deployments to Azure Container Instances can be made directly from images in Docker Hub and Azure Container Registries in the Registries view. [#1718](https://github.com/microsoft/vscode-docker/issues/1718)
* ACI containers can now be stopped and started from the Explorer view. [#2265](https://github.com/microsoft/vscode-docker/pull/2265)
* Templates for scaffolding can be provided with the new `docker.scaffolding.templatePath` setting. [#1617](https://github.com/microsoft/vscode-docker/issues/1617)
* The scaffolding experience is now a wizard, which has improved UX. [#1642](https://github.com/microsoft/vscode-docker/issues/1642)

### Changed
* The outdated image check feature has been turned off by default. It can still be turned on in settings but may result in rate limiting from Docker Hub. For more information see [#2272](https://github.com/microsoft/vscode-docker/issues/2272).

### Removed
* The command `vscode-docker.api.configure` has been removed. The command `vscode-docker.configure` can still be used to programmatically scaffold Dockerfiles. [#2267](https://github.com/microsoft/vscode-docker/pull/2267)

## 1.5.0 - 17 August 2020
### Added
* The applicable Docker context types can be set on customized commands. [#2168](https://github.com/microsoft/vscode-docker/issues/2168)
* Image size has been added in the Explorer view as an optional property for labels and sorting. [#2047](https://github.com/microsoft/vscode-docker/issues/2047)

### Fixed
* Terminal windows will be reused, instead of opening a new terminal window every time. [#251](https://github.com/microsoft/vscode-docker/issues/251)
* The recommended exec form of CMD directives is now used wherever possible. [#2090](https://github.com/microsoft/vscode-docker/issues/2090)
* Debugging no longer stops on hot reload in Python. [#2148](https://github.com/microsoft/vscode-docker/issues/2148)
* Grouping containers by networks used is not working [#2185](https://github.com/microsoft/vscode-docker/issues/2185)
* Activation errors due to filesystem permissions [#2204](https://github.com/microsoft/vscode-docker/issues/2204)
* Prompt to copy debugger into container shows up repeatedly [#2186](https://github.com/microsoft/vscode-docker/issues/2186)
* Allow logging to container registries without gnome-keyring installed [#722](https://github.com/microsoft/vscode-docker/issues/722)

### Removed
* The `docker.attachShellCommand.Windows` and `docker.attachShellCommand.Linux` settings have been removed. [Command customization](https://code.visualstudio.com/docs/containers/reference#_command-customization) replaces this functionality.

## 1.4.1 - 22 July 2020
### Fixed
* "Permission denied" issue during extension activation. [#2181](https://github.com/microsoft/vscode-docker/issues/2181)

## 1.4.0 - 22 July 2020
### Added
* Support for Azure Container Instances Docker contexts. [#2102](https://github.com/microsoft/vscode-docker/issues/2102)
* ACI contexts can be created from the command palette or contexts view. [#2114](https://github.com/microsoft/vscode-docker/issues/2114)
* Outdated base images are now flagged with a warning icon. The base image must be in the root namespace in Docker Hub (i.e. docker.io/library). This feature is on by default but can be disabled via the `docker.images.checkForOutdatedImages` setting. [#1493](https://github.com/microsoft/vscode-docker/issues/1493)

### Fixed
* Python debugging launcher now uses `python3` instead of `python`, to ensure Python 3.* is always run. [#2123](https://github.com/microsoft/vscode-docker/issues/2123)
* "Cannot read property 'filter' of null" during some commands. [#2030](https://github.com/microsoft/vscode-docker/issues/2030), [#2072](https://github.com/microsoft/vscode-docker/issues/2072), [#2108](https://github.com/microsoft/vscode-docker/issues/2108)
* Node.js and Python debug configurations did not pass along all parameters. [#2024](https://github.com/microsoft/vscode-docker/issues/2024)
* Fixed a few Dockerfile language server issues. [#2043](https://github.com/microsoft/vscode-docker/issues/2043), [#2055](https://github.com/microsoft/vscode-docker/issues/2055)
* Login failure for Azure Container Registries. [#1959](https://github.com/microsoft/vscode-docker/issues/1959)

## 1.3.1 - 18 June 2020
### Fixed
* Python debugging fails with message "Unable to find the debugger in the Python extension" due to new debugger location. [#2080](https://github.com/microsoft/vscode-docker/issues/2080)

## 1.3.0 - 15 June 2020
### Added
* .NET Core attach support added for Windows containers. [#1662](https://github.com/microsoft/vscode-docker/issues/1662)

### Fixed
* Explorer no longer needs to be opened for palette commands to work. [#2029](https://github.com/microsoft/vscode-docker/issues/2029)
* Node base image scaffolded has been updated to latest LTS. [#2037](https://github.com/microsoft/vscode-docker/pull/2037)
* Python debugging now uses debugpy instead of ptvsd, fixing several issues and improving reliability. [#1831](https://github.com/microsoft/vscode-docker/issues/1831), [#1879](https://github.com/microsoft/vscode-docker/issues/1879)
* A custom `docker-compose up` command with no match no longer produces incorrect commands. [#1954](https://github.com/microsoft/vscode-docker/issues/1954)
* Explorer is more responsive when trying to connect to an unreachable SSH host. [#1947](https://github.com/microsoft/vscode-docker/issues/1947)

### Deprecated
* The `docker.attachShellCommand.Windows` and `docker.attachShellCommand.Linux` settings have been deprecated and will be removed in the future. [Command customization](https://code.visualstudio.com/docs/containers/reference#_command-customization) replaces this functionality. [#1980](https://github.com/microsoft/vscode-docker/issues/1980)
* The `docker-coreclr` launch configuration has been deprecated and will be removed in the future. [The `docker` configuration replaces this](https://code.visualstudio.com/docs/containers/debug-common). [#1380](https://github.com/microsoft/vscode-docker/issues/1380)

## 1.2.1 - 26 May 2020
### Fixed
* When changing contexts, UI is more responsive and clear. [#1965](https://github.com/microsoft/vscode-docker/issues/1965)
* .NET 5 images are published in a new repository. [#1973](https://github.com/microsoft/vscode-docker/issues/1973)

## 1.2.0 - 11 May 2020
Requires Visual Studio Code 1.44 or higher.

### Added
* Semantic highlighting support. [#1840](https://github.com/microsoft/vscode-docker/issues/1840)
* Help and Feedback pane in explorer view. [#1893](https://github.com/microsoft/vscode-docker/issues/1893)
* Docker Context pane in explorer view. [#1844](https://github.com/microsoft/vscode-docker/issues/1844)
* Images can be pulled from the images list. [#1313](https://github.com/microsoft/vscode-docker/issues/1313)
* Containers can be grouped by docker-compose project name. [#215](https://github.com/microsoft/vscode-docker/issues/215), [#1846](https://github.com/microsoft/vscode-docker/issues/1846)
* A new setting, `docker.dockerodeOptions`, allowing any options to be provided to Dockerode. [#1459](https://github.com/microsoft/vscode-docker/issues/1459)

### Changed
* Any file named `Dockerfile.*` is now recognized as a Dockerfile. [#1907](https://github.com/microsoft/vscode-docker/issues/1907)

## 1.1.0 - 20 April 2020
### Added
* Custom file names for docker-compose files can be defined. [#102](https://github.com/microsoft/vscode-docker/issues/102)
* The experience for pushing Docker images has been revamped. [#351](https://github.com/microsoft/vscode-docker/issues/351), [#1539](https://github.com/microsoft/vscode-docker/issues/1539), [#1595](https://github.com/microsoft/vscode-docker/issues/1595)
* Extensibility model for registry providers has been improved. [#147](https://github.com/microsoft/vscode-docker/issues/147)
* Generic DockerV2 registries using OAuth can now be connected to in many cases. [#869](https://github.com/microsoft/vscode-docker/issues/869)
* Docker contexts can now be changed, inspected, and removed from the Command Palette. [#1784](https://github.com/microsoft/vscode-docker/issues/1784)
* If the Docker context is changed from outside VSCode, the changes will be picked up in VSCode within 20 seconds by default, configurable with the `docker.contextRefreshInterval` setting. If the Docker context is changed within VSCode it is picked up immediately. [#1790](https://github.com/microsoft/vscode-docker/pull/1790)

### Fixed
* Improved extension activation performance. [#1804](https://github.com/microsoft/vscode-docker/issues/1804)
* Images are deleted by name instead of ID, which resolves several issues. [#1529](https://github.com/microsoft/vscode-docker/issues/1529)
* Error "Task to execute is undefined" when doing Docker build. [#1647](https://github.com/microsoft/vscode-docker/issues/1647)
* .NET Core scaffolding will use assembly name in ENTRYPOINT [#1583](https://github.com/microsoft/vscode-docker/issues/1583)

### Removed
* The `docker.defaultRegistryPath` setting has been removed, as part of the new image push experience.

## 1.0.0 - 9 March 2020
### Added
* Debugging support for Python [#1255](https://github.com/microsoft/vscode-docker/issues/1255)
* Improved support for common Python frameworks (e.g. Django, Flask, etc.) [#1546](https://github.com/microsoft/vscode-docker/issues/1546)
* Multi-select support in Docker explorer, including multi-select for some commands [#331](https://github.com/microsoft/vscode-docker/issues/331)
* Ability to right-click and re-enter incorrect registry credentials [#1122](https://github.com/microsoft/vscode-docker/issues/1122)
* Most command lines can be fully customized [#1596](https://github.com/microsoft/vscode-docker/issues/1596) (and more)
* docker-compose support for .NET Core, including attach config [#1543](https://github.com/microsoft/vscode-docker/issues/1543)
* Changes to selection logic of `docker-compose.yml` files [#370](https://github.com/microsoft/vscode-docker/issues/370) [#379](https://github.com/microsoft/vscode-docker/issues/379) [#569](https://github.com/microsoft/vscode-docker/issues/569)

### Fixed
* Incorrect `WORKDIR paths should be absolute` message [#1492](https://github.com/microsoft/vscode-docker/issues/1492)
* README not showing images in gallery [#1654](https://github.com/microsoft/vscode-docker/issues/1654)

## 0.10.0 - 23 January 2020
### Added
* Better error handling in command execution [#1398](https://github.com/microsoft/vscode-docker/issues/1398), [#1528](https://github.com/microsoft/vscode-docker/issues/1528)
* Place Dockerfile next to project file for .NET projects [#592](https://github.com/microsoft/vscode-docker/issues/592)
* Use container name in shell label [#1463](https://github.com/microsoft/vscode-docker/issues/1463)
* Auto Refresh Azure Registry node after installing Azure Account extension [#1461](https://github.com/microsoft/vscode-docker/issues/1461)
* Show only the applicable container groups in container command execution using command palette [#1430](https://github.com/microsoft/vscode-docker/issues/1430)
* `Copy Full Tag` command added to image context menu and command palette [#1431](https://github.com/microsoft/vscode-docker/issues/1431)
* pull latest image during docker build [#1409](https://github.com/microsoft/vscode-docker/issues/1409)

### Fixed
* Port validation during scaffolding [#1510](https://github.com/microsoft/vscode-docker/issues/1510)
* Use the default registry value in `Docker push` [#1478](https://github.com/microsoft/vscode-docker/issues/1478)
* Various other fixes and improvements: https://github.com/microsoft/vscode-docker/issues?q=is%3Aissue+milestone%3A0.10.0+is%3Aclosed

## 0.9.0 - 15 November 2019
### Added
* Task-based debugging for .NET Core and Node.js: [#1242](https://github.com/microsoft/vscode-docker/issues/1242)
  * These tasks can also be used for generic `docker build` and `docker run` scenarios
* Support for connecting to remote Docker daemons over SSH: [#646](https://github.com/microsoft/vscode-docker/issues/646)
* When using Docker Desktop WSL 2, the WSL daemon or local daemon will be selected automatically, based on `docker context` [#1199](https://github.com/microsoft/vscode-docker/issues/1199)
* `Open in Browser` command added to container context menus [#1429](https://github.com/microsoft/vscode-docker/pull/1429)

### Removed
* `docker.importCertificates` has been removed; the functionality to trust system certificates is now built in to VS Code itself (enabled by default): https://github.com/microsoft/vscode/issues/52880

### Fixed
* Blazor apps using static web assets were not able to be debugged [#1275](https://github.com/microsoft/vscode-docker/issues/1275)
* Various other fixes and improvements: https://github.com/microsoft/vscode-docker/milestone/13?closed=1

## 0.8.2 - 25 October 2019
### Added
* More pattern matches for Dockerfiles (Dockerfile.debug, Dockerfile.dev, Dockerfile.develop, Dockerfile.prod)
* Button to create simple networks [#1322](https://github.com/microsoft/vscode-docker/issues/1322)
* Survey prompt for some active users
* Telemetry event for when Dockerfiles are edited using Docker extension features

### Fixed
* Will not refresh Explorer window if VSCode is not in focus [#1351](https://github.com/microsoft/vscode-docker/issues/1351)

## 0.8.1 - 13 September 2019
### Fixed
* Creating and deploying to a webapp with name containing hyphen (for eg. "abc-xyz") breaks webhook creation. [#1270](https://github.com/Microsoft/vscode-docker/issues/1270)

## 0.8.0 - 12 September 2019
### Added
* Changed default behavior in VS Code remote environments to run as a "workspace" extension instead of a "UI" extension. See [#954](https://github.com/Microsoft/vscode-docker/issues/954) for more information
* Added support to debug ASP.NET Core web apps with SSL enabled
* Added support to debug .NET Core apps with user secrets
* Updated icons to match latest VS Code guidelines
* Automatically create a webhook when deploying an image to Azure App Service

### Fixed
* [Bugs fixed](https://github.com/Microsoft/vscode-docker/issues?q=is%3Aissue+milestone%3A%220.8.0%22+is%3Aclosed)

## 0.7.0 - 9 July 2019
### Added
* Revamped Docker Explorer
  * Containers, images, and registries now have their own explorer which can be hid, resized, or reordered
  * Added per-explorer settings for display format, grouping, and sorting
  * Modified icons to respect theme
  * Moved connection errors and troubleshooting links directly into the explorer instead of as a separate notification
  * Added support for "Load more..." if not all items are retrieved in the first batch
  * Local explorers poll less often (only if the explorer is open)
  * Added per-explorer prune command (system prune is still available from the command palette)
  * Ensured all desctructive actions have a confirmation and are grouped separately in context menus
* Generalized registries view to better support more providers
  * All registries regardless of provider now support viewing repos/tags, pulling images, and setting a registry as default
  * Added docs for contributing a new registry provider
  * Multiple registry providers of the same type can now be connected (e.g. multiple Docker Hub accounts)
  * Added support for GitLab (not including self-hosted)
* Update to version 0.0.21 of the language server (thanks @rcjsuen)
  * Improves linting checks so that there are fewer false positives
  * Fixes variable resolution to ensure that only alphanumeric and underscore characters are considered
* Revamped command palette support
  * Commands are grouped by explorer
  * Commands respect "Group By" setting when prompting for items
  * Leveraged multi-select quick pick to execute a command for multiple items at a time
* Revamped Azure support
  * Registries are grouped by subscription, with option to filter by subscription
  * Tasks are shown in the explorer instead of a webview
  * Task commands and "Deploy to App Service" are supported from the command palette
  * Creating a registry or web app now supports async validation, the back button, and related-name recommendations
* View all namespaces for your Docker Hub account, not just username
* Added explorer for Volumes, including prune, remove, and inspect commands
* Added explorer for Networks (thanks @stuartthomson), including prune, remove, and inspect commands
* Added VS Code settings `docker.certPath`, `docker.tlsVerify`, and `docker.machineName` which directly map to environment variables `DOCKER_CERT_PATH`, `DOCKER_TLS_VERIFY`, and `DOCKER_MACHINE_NAME`

### [Fixed](https://github.com/Microsoft/vscode-docker/issues?q=is%3Aissue+milestone%3A0.7.0+is%3Aclosed+label%3Abug)
* Modified `docker.host` setting to _actually_ be equivalent to `DOCKER_HOST` environment variable
* Respect `file.associations` setting when prompting for a Dockerfile
* Better handle expired credentials for Docker Hub
* `docker.truncateLongRegistryPaths` is now respected for containers as well as images

### Changed
* In order to support more providers and still keep the registries view clean, you must now explicitly connect a provider. Previously signed-in providers will need to be re-connected
* Azure Tasks no longer support custom filtering. This functionality is still available in the portal
* Removed `docker.groupImagesBy` setting in favor of `docker.images.groupBy` (based on a new pattern for all explorers)
* Removed `docker.showExplorer` setting. Instead, right click on the explorer title to hide.
* Removed `docker.promptOnSystemPrune` setting as a part of making all destructive actions consistent

## 0.6.4 - 19 June 2019

### Fixed
* Mitigate error "command 'vscode-docker.images.selectGroupBy' already exists" [#1008](https://github.com/microsoft/vscode-docker/issues/1008)

## 0.6.3 - 18 June 2019

### Changed
* Changed publisher from "PeterJausovec" to "ms-azuretools"

## 0.6.2 - 2 May 2019

### Fixed
* Handle opening resources to use native vscode APIs
* Running the extension in older versions of VS Code
* Report an issue opening a blank webpage due to a large stack frame
* Use appropriate nuget fallback volume mount for dotnet debugging - [#793](https://github.com/Microsoft/vscode-docker/pull/793)
* Ensure debugger directory exists - [#897](https://github.com/Microsoft/vscode-docker/issues/897)

### Added
*  `networkAlias` option to Docker run configuration [#890](https://github.com/Microsoft/vscode-docker/pull/890)

## 0.6.1 - 18 March 2019

### Fixed
* viewLogs are not readable in dark theme [#851](https://github.com/Microsoft/vscode-docker/issues/851)

## 0.6.0 - 12 March 2019

### Added
* Group By options for Images node [#603](https://github.com/Microsoft/vscode-docker/issues/603)
* Add debugging and dockerfile creation for fsharp dotnet core projects (Thanks, @gdziadkiewicz) [#795](https://github.com/Microsoft/vscode-docker/pull/795)
* Add support for Redstone 5 (Thanks, @tfenster) [#804](https://github.com/Microsoft/vscode-docker/pull/804)
* Allow more customization of Docker run configuration (thanks @ismael-soriano)[#690](https://github.com/Microsoft/vscode-docker/pull/690/files)
* Add `network` option to Docker run configuration [#748](https://github.com/Microsoft/vscode-docker/pull/748)

### Fixed
* Use colorblind-friendly icons [#811](https://github.com/Microsoft/vscode-docker/issues/811)
* Don't ask to save registry path if no workspace [#824](https://github.com/Microsoft/vscode-docker/pull/824)
* Two "Docker" tabs in output view [#715](https://github.com/Microsoft/vscode-docker/issues/715)
* Error when deploying images to Azure App Service for a private registry with no authentication [#550](https://github.com/Microsoft/vscode-docker/issues/550)
* Improve Docker Hub login experience [#429](https://github.com/Microsoft/vscode-docker/issues/429), [#375](https://github.com/Microsoft/vscode-docker/issues/375), [#817](https://github.com/Microsoft/vscode-docker/issues/817)
* Resolve .NET Core debugging on Windows (Thanks, @gdziadkiewicz) [#798](https://github.com/Microsoft/vscode-docker/pull/798)
* Earlier validation of Docker .NET Core configuration [#747](https://github.com/Microsoft/vscode-docker/pull/747)
* [.NET Core Debugging] Add support for Alpine images [#771](https://github.com/Microsoft/vscode-docker/pull/771)
* Support for ${workspaceFolder} in dockerRun/Volumes localPath and containerPath [#785](https://github.com/Microsoft/vscode-docker/issues/785)
* Cannot read property 'useCertificateStore' of undefined [#735](https://github.com/Microsoft/vscode-docker/issues/735)
* Operation cancelled error shows up when any user action is cancelled [#718](https://github.com/Microsoft/vscode-docker/issues/718)
* Error showing logs if there are no running containers [#739](https://github.com/Microsoft/vscode-docker/issues/739)
* Wrong DOCKER_HOST config when using docker.host configuration (thanks @ntcong) [#649](https://github.com/Microsoft/vscode-docker/issues/649)

## 0.5.2 - 30 January 2019

### Fixed

* Extension fails to initialize in VS Code Insiders 1.31 [#733](https://github.com/Microsoft/vscode-docker/issues/733)

## 0.5.1 - 8 January 2019

### Fixed

* Require vscode 1.26.0 because it's required by the language client version 5.0.0 [#729](https://github.com/Microsoft/vscode-docker/issues/729)

## 0.5.0 - 7 January 2019

### Added

* Significantly improved startup and installation performance by packaging with webpack
* Support for adding C++ Dockerfile (thanks @robotdad) [#644](https://github.com/Microsoft/vscode-docker/issues/644)

### Fixed

* Fix null ref showing connection error during prune [#653](https://github.com/Microsoft/vscode-docker/issues/653)
* Sporadic failure pushing images to ACR [#666](https://github.com/Microsoft/vscode-docker/issues/666)
* Unhandled error if you cancel saving Azure log [#639](https://github.com/Microsoft/vscode-docker/issues/639)
* Save Azure log dialog shows "log..log" as the filename extension [#640](https://github.com/Microsoft/vscode-docker/issues/640)
* ACR pull image issue [#648](https://github.com/Microsoft/vscode-docker/issues/648)
* ACR Build for Dockerfile fails through extension [#650](https://github.com/Microsoft/vscode-docker/issues/650)
* "Run ACR Task File" from command palette with no .yml file in workspace throws error [#635](https://github.com/Microsoft/vscode-docker/issues/635)
* Add prerequisite check for missing Dockerfile [#687](https://github.com/Microsoft/vscode-docker/issues/687)
* Make the launch.json generation leaner (merci vielmal @isidorn) [#618](https://github.com/Microsoft/vscode-docker/issues/618)

## 0.4.0 - 20 November 2018

### Added
* Added support for self-signed certificates and reading from Windows/Mac certificate stores (currently opt-in) [#613](https://github.com/Microsoft/vscode-docker/issues/613), [#602](https://github.com/Microsoft/vscode-docker/issues/602), [#483](https://github.com/Microsoft/vscode-docker/issues/483)
* Use a different icon for unhealthy containers (thanks @grhm) [#615](https://github.com/Microsoft/vscode-docker/issues/615)
* 8.9-alpine -> 10.13-alpine [#624](https://github.com/Microsoft/vscode-docker/pull/624)
* Adds preview support for debugging .NET Core web applications running in Linux Docker containers.
* Azure Container Registry improvements:
  - Automatic login for pulls (even if Admin user not enabled)
  - Explore and build tasks
  - Display and filter logs
  - Create build from Dockerfile
  - Run ACR task file (.yml)
  - Delete or untag images

### Fixed
* Don't output EXPOSE if empty port specified [#490](https://github.com/Microsoft/vscode-docker/issues/490)
* When attaching shell, use bash if available [#505](https://github.com/Microsoft/vscode-docker/issues/505)
* Fix truncation of long image and container registry paths in the Explorer [#527](https://github.com/Microsoft/vscode-docker/issues/527)
* Performance: Delay loading of Azure Account extension until after activation (part of [#535](https://github.com/Microsoft/vscode-docker/issues/535)). Note: much bigger performance improvements coming in next version!
* Specify .dockerignore language to receive syntax highlighting and toggling of comments (thanks @remcohaszing) [#564](https://github.com/Microsoft/vscode-docker/issues/564)

## 0.3.1 - 25 September 2018

### Fixed

* Error while generating Dockerfile for 'other' [#504](https://github.com/Microsoft/vscode-docker/issues/504)

## 0.3.0 - 21 September 2018

### Added

* Add Docker Files to Workspace
  - Support multiple versions of .NET Core (ASP .NET and Console apps)

### Fixed
* Some private registries returning 404 error [#471](https://github.com/Microsoft/vscode-docker/issues/471)
* You shouldn't have to reload vscode in order for changes to docker.attachShellCommand.{linux,windows}Container to take effect [#463](https://github.com/microsoft/vscode-docker/issues/463)
* Engineering improvements (lint, tests, work toward strict null checking, etc.)

## 0.2.0 - 5 September 2018

### Added
* Add preview support for connecting to private registries
* Improved workflow for Tag Image:
  - User will be asked on the first usage of Tag Image with a registry to save it to the `docker.defaultRegistryPath` setting
  - User will be prompted to tag an image if attempting to push an image with no registry or username
  - New `Set as Default Registry Path` menu on registries
  - When default registry path is prefixed to the image name, it is selected for easy removal or editing
* Improved workflow for Build Image:
  - Previous image name will be remembered
* Azure container registries can now be browsed without having "Admin user" turned on. However, deploying to Azure app service currently still requires it, and you still need to log in to Azure in docker [#359](https://github.com/Microsoft/vscode-docker/issues/359)
* A new [API](docs\api.md) has been added for other extensions to be able to control the "Add Docker Files to Workspace" functionality.
* You can now create and delete Azure (ACR) registries and delete Azure repositories and images directly from the extension.

### Fixed
* Images list does not refresh after tagging an image [#371](https://github.com/Microsoft/vscode-docker/issues/371)
* Don't prompt for Dockerfile if only one in project (command palette->Build Image) [#377](https://github.com/Microsoft/vscode-docker/issues/377)
* Docker Hub repos are not alphabetized consistently [#410](https://github.com/Microsoft/vscode-docker/issues/410)
* Obsolete usage of `go-wrapper` removed from Go Dockerfile (thanks @korservick)
* Error when listing Azure Registries when some of the accounts do not have appropriate permissions (thanks @estebanreyl) [#336](https://github.com/Microsoft/vscode-docker/issues/336)
* UDP exposed ports not launching correctly [#284](https://github.com/Microsoft/vscode-docker/issues/284)
* Adopt version 0.0.19 of the language server (thanks @rcjsuen) [#392](https://github.com/Microsoft/vscode-docker/pull/392). This fix includes:
  - Folding support for comments
  - Fix for [#338 Multi-line LABEL directives highlight as errors](https://github.com/Microsoft/vscode-docker/issues/338)
  - Support for handling SCTP ports in EXPOSE instructions per Docker CE 18.03
  - Optional warning/error for WORKDIR instructions that are not absolute paths (to try to enforce good practices per the official guidelines and recommendations document for Dockerfiles
  - New `docker.languageserver.diagnostics.instructionWorkdirRelative` configuration setting
* Output title corrected [#428](https://github.com/Microsoft/vscode-docker/pull/428)

### Changed
* The `docker.defaultRegistry` setting is now obsolete. Instead of using a combination of `docker.defaultRegistry` and `docker.defaultRegistryPath`, now simply use `docker.defaultRegistryPath`. This will be suggested automatically the first time the extension is run.

## 0.1.0 - 26 July 2018
* Update .NET Core Dockerfile generation [#264](https://github.com/Microsoft/vscode-docker/issues/264). Per the .NET team, don't generate `docker-compose` files for .NET Core
* Update to version 0.0.18 of the language server (thanks @rcjsuen) [#291](https://github.com/Microsoft/vscode-docker/pull/291).  This includes fixes for:
  * Auto-complete/intellisense types too much - it repeats what's already written [#277](https://github.com/Microsoft/vscode-docker/issues/277)
  * Dockerfile linting error in FROM [#269](https://github.com/Microsoft/vscode-docker/issues/269), [#280](https://github.com/Microsoft/vscode-docker/issues/280), [#288](https://github.com/Microsoft/vscode-docker/issues/288), and others
  * Other linting fixes
* Update Linux post-install link in README.md (thanks @gregvanl) [#275](https://github.com/Microsoft/vscode-docker/pull/275)
* Add docker.host setting as alternative for setting DOCKER_HOST environment variable (thanks @tfenster) [#304](https://github.com/Microsoft/vscode-docker/pull/304)
* Basic Dockerfile for Ruby (thanks @MiguelSavignano) [#276](https://github.com/Microsoft/vscode-docker/pull/276)
* Azure container registries bugfixes and enhancements (thanks @estebanreyl, @julialieberman) [#299](https://github.com/Microsoft/vscode-docker/pull/299)
  * Fixes [#266](https://github.com/Microsoft/vscode-docker/issues/266) to fix error when expanding empty container registry
  * Improves Azure explorer expansion speed by parallelizing network calls
  * Alphabetically organized registries listed from azure and organized tags by date of creation
* Add "Docker: Compose Restart" command [#316](https://github.com/Microsoft/vscode-docker/pull/316)
* Add link to extension docs and Azure publish tutorial to readme
* Fix [#295](https://github.com/Microsoft/vscode-docker/issues/295) to provide proper error handling if project file can't be found adding Dockerfile to project
* Fix [#302](https://github.com/Microsoft/vscode-docker/issues/302) so that Compose Up/Down work correctly from the text editor context menu
* Clarify README documentation on DOCKER_HOST to note that DOCKER_CER_PATH may be required for TLS (thanks @mikepatrick) [#324](https://github.com/Microsoft/vscode-docker/pull/324)
* Engineering improvements (tests and lint fixes)

## 0.0.27 - 19 May 2018

* Fixes indentation problem with Python docker-compose.yml files (thanks @brettcannon) [#242](https://github.com/Microsoft/vscode-docker/pull/242)
* Adds support for showing the Docker explorer in a new Activity Bar view
* Adopt v0.0.17 of the language server (thanks @rcjsuen!) [#249](https://github.com/Microsoft/vscode-docker/pull/249)

## 0.0.26 - 30 Mar 2018

* Support generating Java Dockerfiles (thanks @testforstephen) [#235](https://github.com/Microsoft/vscode-docker/pull/235)
* Support generating Python Dockerfiles (thanks @brettcannon) [#219](https://github.com/Microsoft/vscode-docker/pull/219)

## 0.0.25 - 27 Feb 2018

* Fixes [#217](https://github.com/Microsoft/vscode-docker/issues/217) to adopt the usage of ASAR in VS Code
* Support for multi-select of `docker-compose` files and then issuing the `compose up` or `compose down` commands.
* Changed the default of `promptOnSystemPrune` setting to `true`, meaning you will get a confirmation when running the `System Prune` prune command by default. You can change this by setting `docker.promptOnSystemPrune: false` in your `settings.json`. Thanks to [@driskell](https://github.com/driskell) for [PR #213](https://github.com/Microsoft/vscode-docker/pull/213).
* Right click commands on `dockerfile` and `docker-compose.yml` files are now enabled based on a regular expression over the file name rather than being hard coded.

## 0.0.24 - 02 Feb 2018

* Fixes [#189](https://github.com/Microsoft/vscode-docker/issues/189) to provide friendly errors when Docker is not running
* Fixes [#200](https://github.com/Microsoft/vscode-docker/issues/200) to provide two new options `dockerComposeBuild` and `dockerComposeDetached` control how `docker-compose` is launched
* Fixes [#208](https://github.com/Microsoft/vscode-docker/issues/208) where an incorrect repository name was being passed to Azure App Services
* Update to `v0.0.13` of the Docker Language Server (thanks @rcjsuen) [#198](https://github.com/Microsoft/vscode-docker/pull/198)
* Activate on `onDebugInitialConfigurations` instead of `onDebug` to delay loading (thanks @gregvanl)
* Thank you to @DovydasNavickas for [PR #202](https://github.com/Microsoft/vscode-docker/pull/202) to fix grammatical errors

## 0.0.23 - 05 Jan 2018

* Do not show dangling images in explorer (thanks @johnpapa) [#175](https://github.com/Microsoft/vscode-docker/pull/175)
* Add configuration to prompt on System Prune, fixes [#183](https://github.com/Microsoft/vscode-docker/issues/183)
* Upgrade to new language server (thanks @rcjsuen) [#173](https://github.com/Microsoft/vscode-docker/pull/173)
* Adding show logs command to dead containers (thanks @FredrikFolkesson) [#178](https://github.com/Microsoft/vscode-docker/pull/178)
* Default to Node 8.9 when generating Dockerfile (thanks @johnpapa) [#174](https://github.com/Microsoft/vscode-docker/pull/174)
* Add `compose up` and `compose down` context menus for files explicitly named `docker-compose.yml` or `docker-compose.debug.yml`
* Browse to the Azure portal context menu, fixes [#151](https://github.com/Microsoft/vscode-docker/issues/151)
* Add `docker.truncateLongRegistryPaths` and `docker.truncateMaxLength` configuration options enable truncation of long image and container names in the Explorer, fixes [#180](https://github.com/Microsoft/vscode-docker/issues/180)
* Images in the Explorer now show age (e.g. '22 days ago')
* Update `Dockerfile` for `go` workspaces (thanks @vladbarosan) [#194](https://github.com/Microsoft/vscode-docker/pull/194)

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
* Add support for browsing Docker Hub and Azure Container Registries
* Add support for deploying images from Docker Hub and Azure Container Registries to Azure App Service
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
* Updated Azure CLI image name, map .azure folder from host file system, fix block running on Windows containers, fix Windows path issues (this didn't make it into `0.0.12`)
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
