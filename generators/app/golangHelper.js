/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict'

var util = require('./utils.js');
var path = require('path');
var process = require('process');

/**
 * Represents a helper for Golang projects.
 * @constructor
 * @param {boolean} isWeb - True if Go project is a web project, false otherwise.
 * @param {int} portNumber - Port number.
 * @param {string} imageName - App image name.
 */
var GolangHelper = function(isWeb, portNumber, imageName) {
    this._isWeb = isWeb;
    this._portNumber = portNumber;
    this._imageName = imageName;
}

/**
 * Gets the Docker image name.
 * @returns {string}
 */
GolangHelper.prototype.getDockerImageName = function() {
    return 'golang';
}

/**
 * Gets the port number.
 * @returns {int}
 */
GolangHelper.prototype.getPortNumber = function() {
    return this._portNumber;
}

/**
 * Gets the app image name.
 * @returns {string}
 */
GolangHelper.prototype.getImageName = function() {
    return this._imageName;
}

/**
 * Gets the template script name.
 * @returns {string}
 */
GolangHelper.prototype.getTemplateScriptName = function() {
    return util.isWindows() ? '_dockerTaskGolang.cmd' : '_dockerTaskGolang.sh';
}

/**
 * Gets the template Dockerfile name.
 * @returns {string}
 */
GolangHelper.prototype.getTemplateDockerfileName = function() {
    return '_Dockerfile.golang';
}

/**
 * Gets the project name (this is used in the Dockerfile).
 * @returns {string}
 */
GolangHelper.prototype.getProjectName = function() {
    // Use the current folder name for project name.
    return process.cwd().split(path.sep).pop();
}

/**
 * Gets the command for opening the web site.
 * @returns {string}
 */
GolangHelper.prototype.getOpenWebSiteCommand = function() {
    var command = '';

    if (this._isWeb) {
        if (util.isWindows()) {
            command = 'FOR /F %%i IN (\' "docker-machine ip %dockerHostName:"=%" \') do set tmpValue=%%i\
                       \r\n\t\tset ipValue=%tmpValue: =%\
                       \r\n\t\tstart http://%ipValue%:' + this._portNumber;
        } else {
            command = 'open \"http://$(docker-machine ip $dockerHostName):' + this._portNumber + '\"';
        }
    }

    return command;
}

/**
 * Gets the command for running the docker container.
 * @returns {string}
 */
GolangHelper.prototype.getContainerRunCommand = function() {
    return this._isWeb ? 'docker run -di -p ' + this._portNumber + ':' + this._portNumber + ' ' + this._imageName :
        'docker run -di ' + this._imageName;
}

module.exports = GolangHelper;