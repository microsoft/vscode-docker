/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/
 
'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;

function createNodeJsPrompts(addNodemon, portNumber, imageName, dockerHostName) {
    return {
        projectType: 'nodejs',
        addNodemon: addNodemon,
        portNumber: portNumber,
        imageName: imageName,
        dockerHostName: dockerHostName
    }
}

describe('node.js generator', function() {
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
                    done();
                })
        }),
        it('creates Dockerfile with correct contents (with Nodemon)', function(done) {
            var portNumber = 1234;
            var imageName = 'nodejsimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createNodeJsPrompts(true, portNumber, imageName, dockerHostName))
                .on('end', function() {            
                    assert.fileContent(
                        'Dockerfile', 'FROM node');
                    assert.fileContent(
                        'Dockerfile', 'EXPOSE ' + portNumber);
                    assert.fileContent(
                        'Dockerfile', 'RUN npm install nodemon -g');
                    assert.fileContent(
                        'Dockerfile', 'CMD ["nodemon"]');
                    done();
                })
        }),
        it('creates dockerTask.sh with correct contents (with Nodemon)', function(done) {
            var portNumber = 1234;
            var imageName = 'nodejsimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createNodeJsPrompts(true, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.fileContent(
                        'dockerTask.sh', 'imageName="' + imageName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'publicPort=' + portNumber);
                    assert.fileContent(
                        'dockerTask.sh', 'dockerHostName="' + dockerHostName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'docker run -di -p $publicPort:$containerPort -v `pwd`:/src $imageName');
                    done();
                })
        })
    it('creates Dockerfile with correct contents (without Nodemon)', function(done) {
            var portNumber = 1234;
            var imageName = 'nodejsimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createNodeJsPrompts(false, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.fileContent(
                        'Dockerfile', 'FROM node');
                    assert.fileContent(
                        'Dockerfile', 'EXPOSE ' + portNumber);
                    assert.noFileContent(
                        'Dockerfile', 'RUN npm install nodemon -g');
                    assert.fileContent(
                        'Dockerfile', 'CMD ["node", "./bin/www"]');
                    done();
                })
        }),
        it('creates dockerTask.sh with correct contents (without Nodemon)', function(done) {
            var portNumber = 1234;
            var imageName = 'nodejsimagename';
            var dockerHostName = 'default';
            helpers.run(path.join(__dirname, '../generators/app'))
                .withPrompts(createNodeJsPrompts(false, portNumber, imageName, dockerHostName))
                .on('end', function() {
                    assert.fileContent(
                        'dockerTask.sh', 'imageName="' + imageName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'publicPort=' + portNumber);
                    assert.fileContent(
                        'dockerTask.sh', 'dockerHostName="' + dockerHostName + '"');
                    assert.fileContent(
                        'dockerTask.sh', 'docker run -di -p $publicPort:$containerPort $imageName');
                    done();
                })
        })
});