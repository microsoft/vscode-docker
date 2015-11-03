/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict'

var util = require('./utils.js');
var path = require('path');
var process = require('process');

/**
 * Represents a helper for Node.js projects.
 * @constructor
 * @param {boolean} useNodemon - True if Nodemon should be used, false otherwise.
 * @param {int} portNumber - Port number.
 * @param {string} imageName - App image name.
 */
var NodejsHelper = function(useNodemon, portNumber, imageName) {
    this._useNodemon = useNodemon;
    this._portNumber = portNumber;
    this._imageName = imageName;
}

/**
 * Gets the Docker image name.
 * @returns {string}
 */
NodejsHelper.prototype.getDockerImageName = function() {
    return 'node';
}

/**
 * Gets the port number.
 * @returns {int}
 */
NodejsHelper.prototype.getPortNumber = function() {
    return this._portNumber;
}

/**
 * Gets the app image name.
 * @returns {string}
 */
NodejsHelper.prototype.getImageName = function() {
    return this._imageName;
}

/**
 * Gets run command to be used in the Dockerfile.
 * @returns {string}
 */
NodejsHelper.prototype.getDockerfileRunCommand = function() {
    return this._useNodemon ? 'CMD ["nodemon"]' : 'CMD ["node", "./bin/www"]';
}

/**
 * Gets the Nodemon command to be used in the Dockerfile.
 * @returns {string}
 */
NodejsHelper.prototype.getNodemonCommand = function() {
    return this._useNodemon ? 'RUN npm install nodemon -g' : '';
}

/**
 * Gets the template script name.
 * @returns {string}
 */
NodejsHelper.prototype.getTemplateScriptName = function() {
    return util.isWindows() ? '_dockerTaskGeneric.cmd' : '_dockerTaskGeneric.sh';
}

/**
 * Gets the template Dockerfile name.
 * @returns {string}
 */
NodejsHelper.prototype.getTemplateDockerfileName = function() {
    return '_Dockerfile.nodejs';
}

/**
 * Gets the parameter for volume sharing used in the docker run command.
 * @returns {string}
 */
NodejsHelper.prototype._getVolumeShareParameter = function() {
    // Use for volume sharing in Windows.
    var sourcePath = '/' + process.cwd().replace(path.sep, '/');
    return util.isWindows() ? '-v ' + sourcePath + ':/src' : '-v `pwd`:/src';
}

/**
 * Gets the port parameter to be used in the docker run command.
 * @returns {string}
 */
NodejsHelper.prototype._getPortParameter = function() {
    return '-p ' + util.scriptify('publicPort') + ':' + util.scriptify('containerPort');
}

/**
 * Gets the value indicating whether -v parameter can be used in the docker run command.
 * For volume sharing on Windows, project has to be under %HOMEDRIVE%\Users\ folder.
 * @returns {boolean}
 */
NodejsHelper.prototype.canShareVolume = function() {
    if (util.isWindows() && this._useNodemon) {
        var splitFolders = process.cwd().split(path.sep);
        var rootFolder = splitFolders[0] + path.sep + splitFolders[1];
        
        if (rootFolder.toLowerCase() != process.env.HOMEDRIVE.toLowerCase() + path.sep + 'users') {
            return false;
        }
    }

    return true;
}

/**
 * Gets the command for running the docker container.
 * @returns {string}
 */
NodejsHelper.prototype.getContainerRunCommand = function() {
    return this._useNodemon ?
        'docker run -di ' + this._getPortParameter() + ' ' + this._getVolumeShareParameter() + ' ' + util.scriptify('imageName') :
        'docker run -di ' + this._getPortParameter() + ' ' + util.scriptify('imageName');;
}

module.exports = NodejsHelper;