/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path = require('path');
var process = require('process');
var exec = require('child_process').exec;
var util = require('./utils.js');
var NodejsHelper = require('./nodejsHelper.js');
var GolangHelper = require('./golangHelper.js');
var AspNetHelper = require('./aspnetHelper.js');

// General
var projectType = '';
var error = false;

// Docker variables
var portNumber = 3000;
var imageName = '';
var dockerHostName = 'default';
var DOCKERFILE_NAME = 'Dockerfile';

// Node.js variables
var addNodemon = false;

// Golang variables
var isGoWeb = false;

// ASP.NET variables
var aspNetVersion = '';
var kestrelCommandAdded = false;

/**
 * Show prompts to the user.
 */
function showPrompts() {
    var done = this.async();
    var prompts = [{
        type: 'list',
        name: 'projectType',
        message: 'What language is your project using?',
        choices: [{
            name: 'ASP.NET 5',
            value: 'aspnet'
        }, {
            name: 'Golang',
            value: 'golang'
        }, {
            name: 'Node.js',
            value: 'nodejs'
        }]
    }, {
        type: 'confirm',
        name: 'addNodemon',
        message: 'Do you want to use Nodemon?',
        when: function(answers) {
            return answers.projectType === 'nodejs';
        }
    }, {
        type: 'list',
        name: 'aspNetVersion',
        message: 'Which version of ASP.NET 5 is your project using?',
        choices: [{
            name: 'beta8',
            value: '1.0.0-beta8'
        }, {
            name: 'beta7',
            value: '1.0.0-beta7'
        }],
        when: function(answers) {
            return answers.projectType === 'aspnet';
        }
    }, {
        type: 'confirm',
        name: 'isGoWeb',
        message: 'Does your Go project use a web server?',
        when: function(answers) {
            return answers.projectType === 'golang';
        }
    }, {
        type: 'input',
        name: 'portNumber',
        message: 'Which port is your app listening to?',
        default: function(answers) {
            return answers.projectType === 'aspnet' ? 5000 : 3000;
        },
        when: function(answers) {
            // Show this answer if user picked ASP.NET, Node.js or Golang that's using a web server.
            return answers.projectType === 'aspnet' || answers.projectType === 'nodejs' || (answers.projectType === 'golang' && answers.isGoWeb);
        }
    }, {
        type: 'input',
        name: 'imageName',
        message: 'What do you want to name your image?',
        default: process.cwd().split(path.sep).pop().toLowerCase() + '_image',
    }, {
        type: 'input',
        name: 'dockerHostName',
        message: 'What\'s the name of your docker host machine?',
        default: 'default',
    }];

    this.prompt(prompts, function(props) {
        projectType = props.projectType;
        addNodemon = props.addNodemon;
        portNumber = props.portNumber;
        imageName = props.imageName;
        dockerHostName = props.dockerHostName;
        isGoWeb = props.isGoWeb;
        aspNetVersion = props.aspNetVersion;

        done();
    }.bind(this));
}

/**
 * Handles Node.js option.
 */
function handleNodeJs(yo) {
    var nodeJs = new NodejsHelper(addNodemon, portNumber, imageName);

    if (!nodeJs.canShareVolume()) {
        error = true;
        yo.log.error('Your project has to be under %HOMEDRIVE%\Users folder in order to use Nodemon on Windows.');
        return;
    }

    yo.fs.copyTpl(
        yo.templatePath(nodeJs.getTemplateDockerfileName()),
        yo.destinationPath(DOCKERFILE_NAME), {
            imageName: nodeJs.getDockerImageName(),
            nodemonCommand: nodeJs.getNodemonCommand(),
            portNumber: nodeJs.getPortNumber(),
            runCommand: nodeJs.getDockerfileRunCommand()
        });

    yo.fs.copyTpl(
        yo.templatePath(nodeJs.getTemplateScriptName()),
        yo.destinationPath(util.getDestinationScriptName()), {
            imageName: nodeJs.getImageName(),
            portNumber: nodeJs.getPortNumber(),
            dockerHostName: dockerHostName,
            containerRunCommand: nodeJs.getContainerRunCommand()
        });
}

/**
 * Handles Golang option.
 */
function handleGolang(yo) {
    var golang = new GolangHelper(isGoWeb, portNumber, imageName);

    yo.fs.copyTpl(
        yo.templatePath(golang.getTemplateDockerfileName()),
        yo.destinationPath(DOCKERFILE_NAME), {
            imageName: golang.getDockerImageName(),
            projectName: golang.getProjectName()
        });

    yo.fs.copyTpl(
        yo.templatePath(golang.getTemplateScriptName()),
        yo.destinationPath(util.getDestinationScriptName()), {
            imageName: golang.getImageName(),
            runImageCommand: golang.getContainerRunCommand(),
            openWebSiteCommand: golang.getOpenWebSiteCommand(),
            dockerHostName: dockerHostName
        });
}

/**
 * Handles ASP.NET option.
 */
function handleAspNet(yo) {
    var aspNet = new AspNetHelper(aspNetVersion, portNumber, imageName);

    var done = yo.async();
    aspNet.addKestrelCommand(function(err, commandAdded) {
        if (err) {
            error = true;
            yo.log.error(err);
            return;
        }
        kestrelCommandAdded = commandAdded;
        done();
    }.bind(yo));
    
        yo.fs.copyTpl(
            yo.templatePath(aspNet.getTemplateDockerfileName()),
            yo.destinationPath(DOCKERFILE_NAME), {
                imageName: aspNet.getDockerImageName(),
                portNumber: aspNet.getPortNumber(),
                aspNetCommandName: aspNet.getAspNetCommandName()
            });

        yo.fs.copyTpl(
            yo.templatePath(aspNet.getTemplateScriptName()),
            yo.destinationPath(util.getDestinationScriptName()), {
                imageName: aspNet.getImageName(),
                portNumber: aspNet.getPortNumber(),
                dockerHostName: dockerHostName,
                containerRunCommand: aspNet.getContainerRunCommand()
            });
}

/**
 * Called at the end of the generator.
 */
function end() {
    if (error) {
        this.log(chalk.red('Errors occured. Please fix them and re-run the generator.'));
        return;
    }

    var done = this.async();
    if (!util.isWindows()) {
        exec('chmod +x ' + util.getDestinationScriptName(), function(err) {
            if (err) {
                this.log.error(err);
                this.log.error('Error making script executable. Run ' + chalk.bold('chmod +x ' + util.getDestinationScriptName()) + ' manually.');
                error = true;
            }
            done();
        }.bind(this));
    } 

    if (kestrelCommandAdded) {
        this.log('We noticed your project.json file didn\'t know how to start the kestrel web server. We\'ve fixed that for you.');
    }

    this.log('Your project is now ready to run in a Docker container!');
    this.log('Run ' + chalk.green(util.getDestinationScriptName()) + ' to build a Docker image and run your app in a container.');
}

/**
 * Docker Generator.
 */
var DockerGenerator = yeoman.generators.Base.extend({
    constructor: function() {
        yeoman.generators.Base.apply(this, arguments);
    },

    init: function() {
        this.log(yosay('Welcome to the ' + chalk.red('Docker') + ' generator!' + chalk.green('\nLet\'s add Docker container magic to your app!')));
    },

    askFor: showPrompts,
    writing: function() {
        this.sourceRoot(path.join(__dirname, './templates'));
        switch (projectType) {
            case 'nodejs':
                {
                    handleNodeJs(this);
                    break;
                }
            case 'golang':
                {
                    handleGolang(this);
                    break;
                }
            case 'aspnet':
                {
                    handleAspNet(this);
                    break;
                }
            default:
                this.log.error(':( not implemented.');
                break;
        }
    },
    end: end
});

module.exports = DockerGenerator;