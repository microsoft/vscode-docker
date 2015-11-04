/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
'use strict'

var util = require('./utils.js');
var path = require('path');
var process = require('process');
var fs = require('fs');

/**
 * Represents a helper for ASP.NET projects.
 * @constructor
 * @param {string} aspNetVersion - ASP.NET version to use.
 * @param {int} portNumber - Port number.
 * @param {string} imageName - App image name.
 */
var AspNetHelper = function(aspNetVersion, portNumber, imageName) {
    this._aspNetVersion = aspNetVersion;
    this._portNumber = portNumber;
    this._imageName = imageName;
}

/**
 * Gets the Docker image name.
 * @returns {string}
 */
AspNetHelper.prototype.getDockerImageName = function() {
    return 'microsoft/aspnet:' + this._aspNetVersion;
}

/**
 * Gets the port number.
 * @returns {int}
 */
AspNetHelper.prototype.getPortNumber = function() {
    return this._portNumber;
}

/**
 * Gets the app image name.
 * @returns {string}
 */
AspNetHelper.prototype.getImageName = function() {
    return this._imageName;
}

/**
 * Creates a backup of a file.
 * @param {string} sourceFile - Source file.
 * @param {string} targetFile - Target file.
 */
AspNetHelper.prototype._backupFile = function(sourceFile, targetFile) {
    fs.readFile(sourceFile, 'utf8', function(err, data) {
        if (err) {
            console.log('Error reading file: ' + err);
            return;
        }
        fs.writeFile(targetFile, data);
    });
}

/**
 * Checks if  'kestrel' command is in the  project.json and adds it if command is not there yet.
 * @returns {boolean}
 */
AspNetHelper.prototype.addKestrelCommand = function(cb) {
    var rootFolder = process.cwd() + path.sep;
    var fileName = rootFolder + 'project.json';
    var backupFile = rootFolder + 'project.json.backup';
    var port = this._portNumber;
    
    fs.readFile(fileName, 'utf8', function(err, data) {
        if (err) {
            cb(new Error('Can\'t read project.json file. Make sure project.json file exists.'));
            return;
        }

        // Remove BOM.
        if (data.charCodeAt(0) === 0xFEFF) {
            data = data.replace(/^\uFEFF/, '');
        }

        data = JSON.parse(data);

        if (data.commands.kestrel === undefined) {
            AspNetHelper.prototype._backupFile(fileName, backupFile);
            data.commands.kestrel = 'Microsoft.AspNet.Hosting --server Microsoft.AspNet.Server.Kestrel --server.urls http://*:' + port;
            fs.writeFile(fileName, JSON.stringify(data), function(err) {
                if (err) {
                    cb(new Error('Can\'t write to project.json file.'));
                    return;
                }
                cb(null, true);
                return;
            });
        }
        cb(null, false);
        return;
    });
}

/**
 * Gets the template script name.
 * @returns {string}
 */
AspNetHelper.prototype.getTemplateScriptName = function() {
    return util.isWindows() ? '_dockerTaskGeneric.cmd' : '_dockerTaskGeneric.sh';
}

/**
 * Gets the template Dockerfile name.
 * @returns {string}
 */
AspNetHelper.prototype.getTemplateDockerfileName = function() {
    return '_Dockerfile.aspnet';
}

/**
 * Gets the port parameter to be used in the docker run command.
 * @returns {string}
 */
AspNetHelper.prototype._getPortParameter = function() {
    return '-p ' + util.scriptify('publicPort') + ':' + util.scriptify('containerPort');
}

/**
 * Gets the container run command used in docker run command.
 * @returns {string}
 */
AspNetHelper.prototype.getContainerRunCommand = function() {
    return 'docker run -di ' + this._getPortParameter() + ' ' + util.scriptify('imageName');
}

/**
 * Gets the ASP.NET command name that's defined in the project.json file.
 * @returns {string}
 */
AspNetHelper.prototype.getAspNetCommandName = function() {
    return 'kestrel';
}

module.exports = AspNetHelper;
