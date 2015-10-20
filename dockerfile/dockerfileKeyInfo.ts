/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

// https://docs.docker.com/reference/builder/
export var KEY_INFO:{[keyName:string]:string;} = {
	'FROM': (
		"Sets the *Base Image* for subsequent instructions."
	),
	'MAINTAINER': (
		"Set the *Author* field of the generated images."
	),
	'RUN': (
		"Executes any commands in a new layer on top of the current image and commits the results."
	),
	'CMD': (
		"Provides defaults for an executing container."
	),
	'LABEL': (
		"Adds metadata to an image. A *LABEL* is a key-value pair."
	),
	'EXPOSE': (
		"Informs Docker that the container will listen on the specified network ports at runtime."
	),
	'ENV': (
		"Sets the environment variable `key` to the value `value`."
	),
	'ADD': (
		"The *ADD* instruction copies new files, directories or remote file URLs from `src` and adds them " +
		"to the filesystem of the container at the path `dest`."
	),
	'COPY': (
		"Copies new files or directories from `src` and adds them to the filesystem of the container at the path `dest`."
	),
	'ENTRYPOINT': (
		"Configures a container that will run as an executable."
	),
	'VOLUME': (
		"Creates a mount point with the specified name and marks it as holding externally mounted volumes " +
		"from native host or other containers."
	),
	'USER': (
		"Sets the user name or UID to use when running the image and for any `RUN`, `CMD` and `ENTRYPOINT` " +
		"instructions that follow it in the Dockerfile."
	),
	'WORKDIR': (
		"Sets the working directory for any `RUN`, `CMD`, `ENTRYPOINT`, `COPY` and `ADD` instructions that follow it in the Dockerfile."
	),
	'ONBUILD': (
		"Adds to the image a trigger instruction to be executed at a later time, when the image is used as the " +
		"base for another build."
	)
}