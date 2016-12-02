# Docker Support for Visual Studio Code
The Docker extension it easy to build and deploy containerized applications from Visual Studio Code. 

* Automatic dockerfile and docker-compose.yml file generation 
* Syntax highlighting and hover tips for docker-compose.yml and dockerfile files
* Snippets for dockerfile files
* IntelliSense (completions) on image names from Dockerhub.com
* Linting (errors and warnings) for dockerfile files
* Command Palette (F1) integration for the most common Docker commands (e.g. Build, Push)

![dockerfile](images/dockerfile.gif)

Similar functionality is available for Docker compose files (v1 and v2 formats):

![composefile](images/dockercompose.gif)

## Installation
Installation is easy! In VS Code, press F1 and type in `ext install vscode-docker`. Once the extension is installed you will be prompted to restart Visual Studio Code which will only take (literally) a couple of seconds. 

Of course, you will want to have Docker installed on your computer in order to run commands from the Command Palette (F1, type in `Docker`).  

![installation](images/installing.gif)

## Running commands on Linux
By default, Docker runs as the root user, requiring other users to access it with `sudo`. This extension does not assume root access, so you will need to create a Unix group called docker and add users to it. Instructions can be found here: [Create a Docker group](https://docs.docker.com/engine/installation/linux/ubuntulinux/#/create-a-docker-group)

## Contributing
There are a couple of ways you can contribute to this repo:

- Ideas, feature requests and bugs: We are open to all ideas and we want to get rid of bugs! Use the Issues section to either report a new issue, provide your ideas or contribute to existing threads
- Documentation: Found a typo or strangely worded sentences? Submit a PR!
- Code: Contribute bug fixes, features or design changes.

## Legal
Before we can accept your pull request you will need to sign a **Contribution License Agreement**. All you need to do is to submit a pull request, then the PR will get appropriately labelled (e.g. `cla-required`, `cla-norequired`, `cla-signed`, `cla-already-signed`). If you already signed the agreement we will continue with reviewing the PR, otherwise system will tell you how you can sign the CLA. Once you sign the CLA all future PR's will be labeled as `cla-signed`.

## License 
[MIT](LICENSE)
