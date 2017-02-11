


## 0.0.12 - 11 February 2017

* Removed `MAINTAINER` from templates and linting warnings by upgrading the `dockerfile_lint` module (Docker has deprecated `MAINTAINER` in favor of `LABEL`).
* Added command to run `docker system prune`, note we use the `-f` (force) flag to ignore the confirmation prompt.
* `Docker: Attach Shell` command now supports Windows containers [#58](https://github.com/microsoft/vscode-docker/pull/58).

## 0.0.10 - 12 December 2016

* Added context menu support to run the Docker Build command on Dockerfile files from the editor or from the explorer.
* Docker logs now uses the -f flag ([follow](https://docs.docker.com/engine/reference/commandline/logs/)) to continue streaming the logs to terminal. 

## 0.0.11 - 4 January 2017

* Fixed [Issue 51](https://github.com/microsoft/vscode-docker/issues/51), a path problem on Windows.