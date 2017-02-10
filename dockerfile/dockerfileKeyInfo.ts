/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { KeyInfo } from "../dockerExtension";

// https://docs.docker.com/reference/builder/
export const DOCKERFILE_KEY_INFO: KeyInfo = {
    'ADD': (
        "The **ADD** instruction copies new files, directories or remote file URLs from `src` and adds them " +
        "to the filesystem of the container at the path `dest`."
    ),
    'ARG': (
        "Defines a variable that users can specify at build-time, by means of the **--build-arg <varname>=<value>** flag of the **docker build** command."
    ),
    'CMD': (
        "Provides defaults for an executing container."
    ),
    'COPY': (
        "Copies new files or directories from `src` and adds them to the filesystem of the container at the path `dest`."
    ),
    'ENTRYPOINT': (
        "Configures a container that will run as an executable."
    ),
    'ENV': (
        "Sets the environment variable `key` to the value `value`."
    ),
    'EXPOSE': (
        "Informs Docker that the container will listen on the specified network ports at runtime."
    ),
    'FROM': (
        "Sets the **Base Image** for subsequent instructions."
    ),
    'HEALTHCHECK': (
        "Specifies a command that Docker should run within the container, in order to determine whether it's functioning properly."
    ),
    'LABEL': (
        "Adds metadata to an image. A **LABEL** is a key-value pair."
    ),
    'ONBUILD': (
        "Adds to the image a trigger instruction to be executed at a later time, when the image is used as the " +
        "base for another build."
    ),
    'RUN': (
        "Executes any commands in a new layer on top of the current image and commits the results."
    ),
    'SHELL': (
        "Specifies the default shell that should be used for commands which are written in shell-form (e.g. **RUN npm install**)."
    ),
    'STOPSIGNAL': (
        "Sets the system call signal that will be sent to the container to exit."
    ),
    'USER': (
        "Sets the user name or UID to use when running the image and for any `RUN`, `CMD` and `ENTRYPOINT` " +
        "instructions that follow it in the Dockerfile."
    ),
    'VOLUME': (
        "Creates a mount point with the specified name and marks it as holding externally mounted volumes " +
        "from native host or other containers."
    ),
    'WORKDIR': (
        "Sets the working directory for any `RUN`, `CMD`, `ENTRYPOINT`, `COPY` and `ADD` instructions that follow it in the Dockerfile."
    )
};