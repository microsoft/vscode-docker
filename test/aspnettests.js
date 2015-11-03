/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;
var process = require('process');
var fs = require('fs');

function createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName) {
    return {
        projectType: 'aspnet',
        aspNetVersion: aspNetVersion,
        portNumber: portNumber,
        imageName: imageName,
        dockerHostName: dockerHostName
    }
}

function createTestProjectJson(dir, kestrelCommand) {
    var projectJsonData = {
        commands: {
            web: 'this is a web command'
        }
    };

    if (kestrelCommand !== undefined) {
        projectJsonData.commands.kestrel = kestrelCommand;
    }

    var outputFile = dir + path.sep + 'project.json';
    fs.writeFile(outputFile, JSON.stringify(projectJsonData, null, 4), function(err) {
        if (err) {
            assert.fail('error writing project.json file.');
        }
    });
}

describe('aspnet generator', function() {
    it('creates files', function(done) {
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts({
                    projectType: 'nodejs'
                })
                .on('end', function() {
                    assert.file([
                        'Dockerfile',
                        'dockerTask.sh',
                    ]);
                })
            done();
        }),
        it('creates Dockerfile with correct contents', function(done) {
            var portNumber = 1234;
            var imageName = 'aspnetimagename';
            var dockerHostName = 'default';
            var aspNetVersion = '1.0.0-beta8';

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    createTestProjectJson(dir);
                })
                .withPrompts(createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.file('Dockerfile');
                    assert.fileContent(
                        'Dockerfile', 'FROM microsoft/aspnet:' + aspNetVersion);
                    assert.fileContent(
                        'Dockerfile', 'EXPOSE ' + portNumber);
                    assert.fileContent(
                        'Dockerfile', 'ENTRYPOINT ["dnx", "-p", "project.json", "kestrel"');
                })

            done();
        }),
        it('updates project.json and adds the kestrel command if it doesn\'t exist', function(done) {
            var portNumber = 1234;
            var imageName = 'aspnetimagename';
            var dockerHostName = 'default';
            var aspNetVersion = '1.0.0-beta8';

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    createTestProjectJson(dir);
                })
                .withPrompts(createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.file('project.json');
                    assert.fileContent('project.json', 'Microsoft.AspNet.Hosting --server Microsoft.AspNet.Server.Kestrel --server.urls http://*:' + portNumber);
                })
            done();
        }),
        it('creates a project.json.backup file if we add a command', function(done) {
            var portNumber = 1234;
            var imageName = 'aspnetimagename';
            var dockerHostName = 'default';
            var aspNetVersion = '1.0.0-beta8';

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    createTestProjectJson(dir);
                })
                .withPrompts(createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.file('project.json');
                    assert.file('project.json.backup');
                })
            done();
        })

    it('does not create a project.json.backup file if we don\'t add the command', function(done) {
        var portNumber = 1234;
        var imageName = 'aspnetimagename';
        var dockerHostName = 'default';
        var aspNetVersion = '1.0.0-beta8';

        helpers.run(path.join(__dirname, '../generators/app'))
            .inTmpDir(function(dir) {
                createTestProjectJson(dir, 'EXISTING_KESTREL_COMMAND');
            })
            .withPrompts(createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName))
            .on('end', function() {
                assert.file('project.json');
                assert.noFile('project.json.backup');
            });
        done();
    })
    it('does not add the kestrel command if it\'s already there', function(done) {
            var portNumber = 1234;
            var imageName = 'aspnetimagename';
            var dockerHostName = 'default';
            var aspNetVersion = '1.0.0-beta8';

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    createTestProjectJson(dir, 'EXISTING_KESTREL_COMMAND');
                })
                .withPrompts(createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.file('project.json');
                    assert.fileContent('project.json', 'EXISTING_KESTREL_COMMAND');
                });
            done();
        }),

        it('creates dockerTask.sh with correct contents ', function(done) {
            var portNumber = 1234;
            var imageName = 'aspnetimagename';
            var dockerHostName = 'default';
            var aspNetVersion = '1.0.0-beta8';

            helpers.run(path.join(__dirname, '../generators/app'))
                .inTmpDir(function(dir) {
                    createTestProjectJson(dir);
                })
                .withPrompts(createAspNetPrompts(aspNetVersion, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.file('dockerTask.sh');
                    assert.fileContent(
                        'dockerTask.sh', 'imageName="' + imageName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'publicPort=' + portNumber);
                    assert.fileContent(
                        'dockerTask.sh', 'dockerHostName="' + dockerHostName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'docker run -di -p $publicPort:$containerPort $imageName');
                });
            done();
        })
});