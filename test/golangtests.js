/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;

function createGolangPrompts(isWebProject, portNumber, imageName, dockerHostName) {
    return {
        projectType: 'golang',
        isGoWeb: isWebProject,
        portNumber: portNumber,
        imageName: imageName,
        dockerHostName: dockerHostName
    }
}

describe('golang generator', function() {
    it('creates files', function(done) {
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts({
                    projectType: 'golang'
                })
                .on('end', function() {
                    assert.file([
                        'Dockerfile',
                        'dockerTask.sh',
                    ]);
                });
            done();
        }),
        it('creates Dockerfile with correct contents (Web project)', function(done) {
            var portNumber = 1234;
            var imageName = 'golangimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createGolangPrompts(true, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    var currentFolder = process.cwd().split(path.sep).pop();
                    assert.fileContent(
                        'Dockerfile', 'FROM golang');
                    assert.fileContent(
                        'Dockerfile', 'ADD . /go/src/github.com/' + currentFolder);
                    assert.fileContent(
                        'Dockerfile', 'RUN go install github.com/' + currentFolder);
                    assert.fileContent(
                        'Dockerfile', 'ENTRYPOINT /go/bin/' + currentFolder);
                });
            done();
        }),
        it('creates Dockerfile with correct contents (non-Web project)', function(done) {
            var portNumber = 1234;
            var imageName = 'golangimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createGolangPrompts(false, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    var currentFolder = process.cwd().split(path.sep).pop();
                    assert.fileContent(
                        'Dockerfile', 'FROM golang');
                    assert.fileContent(
                        'Dockerfile', 'ADD . /go/src/github.com/' + currentFolder);
                    assert.fileContent(
                        'Dockerfile', 'RUN go install github.com/' + currentFolder);
                    assert.fileContent(
                        'Dockerfile', 'ENTRYPOINT /go/bin/' + currentFolder);
                });
            done();
        }),
        it('creates dockerTask.sh with correct contents (Web project)', function(done) {
            var portNumber = 1234;
            var imageName = 'golangimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createGolangPrompts(true, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.fileContent(
                        'dockerTask.sh', 'imageName="' + imageName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'dockerHostName="' + dockerHostName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'dockerHostName="default"');
                    assert.fileContent(
                        'dockerTask.sh', 'open \"http://$(docker-machine ip $dockerHostName):' + portNumber + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'docker run -di -p ' + portNumber + ':' + portNumber + ' ' + imageName);
                });
            done();
        })
    it('creates dockerTask.sh with correct contents (non-Web project)', function(done) {
        var portNumber = 1234;
        var imageName = 'golangimagename';
        var dockerHostName = 'default';
        helpers.run(path.join(__dirname, '../generators/app'))
            .withPrompts(createGolangPrompts(false, portNumber, imageName, dockerHostName))
            .on('end', function() {
                assert.fileContent(
                    'dockerTask.sh', 'imageName="' + imageName + '"');
                assert.fileContent(
                    'dockerTask.sh', 'dockerHostName="' + dockerHostName + '"');
                assert.fileContent(
                    'dockerTask.sh', 'dockerHostName="default"');
                assert.noFileContent(
                    'dockerTask.sh', 'open \"http://$(docker-machine ip $dockerHostName):' + portNumber + '"');
                assert.fileContent(
                    'dockerTask.sh', 'docker run -di ' + imageName);
            });
        done();
    })
});