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

// General
var projectType = "";
var error = false;

// Docker variables
var portNumber = 3000;
var imageName = "";
var dockerHostName = "default";

// Node.js variables
var addnodemon = false;
var nodemonCommand = 'RUN npm install nodemon -g';
var ScriptNameNodeJs = 'dockerTask.sh';

function showPrompts() {
    var done = this.async();
    var prompts = [{
        type: 'list',
        name: 'type',
        message: 'What language is your project using?',
        choices: [{
            name: 'Node.js',
            value: 'nodejs'
        }, {
            name: 'Golang',
            value: 'golang'
        }]
    }, {
        type: 'confirm',
        name: 'addnodemon',
        message: 'Do you want to use Nodemon?',
        when: function(answers) {
            return answers.type === 'nodejs';
        }
    }, {
        type: 'input',
        name: 'portNumber',
        message: 'Which port is your app listening to?',
        default: "3000",
        when: function(answers) {
            return answers.type === 'nodejs';
        }
    }, {
        type: 'input',
        name: 'imageName',
        message: 'What do you want to name your image?',
        default: process.cwd().split(path.sep).pop() + '_image',
    }, {
        type: 'input',
        name: 'dockerHostName',
        message: 'What\'s the name of your docker host machine?',
        default: 'default',
    }];

    this.prompt(prompts, function(props) {
        projectType = props.type;
        addnodemon = props.addnodemon;
        portNumber = props.portNumber;
        imageName = props.imageName;
        dockerHostName = props.dockerHostName;
        done();
    }.bind(this));
}

function handleNodeJs(yo) {
    // Add the Nodemon command if selected.
    if (!addnodemon) {
        nodemonCommand = '';
    }

    yo.fs.copyTpl(
        yo.templatePath('_Dockerfile.nodejs'),
        yo.destinationPath('Dockerfile'), {
            imageName: 'node',
            nodemonCommand: nodemonCommand,
            portNumber: portNumber,
        });

    yo.fs.copyTpl(
        yo.templatePath('_dockerTaskNodejs.sh'),
        yo.destinationPath(ScriptNameNodeJs), {
            imageName: imageName,
            portNumber: portNumber,
            dockerHostName: dockerHostName
        });
}

function handleGolang() {
    // Not implemented yet.
}

function end() {
    if (error) {
        this.log(chalk.red(':( errors occured.'));
    }

    switch (projectType) {
        case 'nodejs':
            {
                var done = this.async();
                exec('chmod +x ' + ScriptNameNodeJs, function(err) {
                    if (err) {
                        this.log.error(err);
                        this.log.error('Error making script executable. Run ' + chalk.bold('chmod +x ' + ScriptNameNodeJs) + ' manually.');
                        error = true;
                    }
                    done();
                }.bind(this));
                this.log('Your project is now ready to run in a Docker container!');
                this.log('Run ' + chalk.green(ScriptNameNodeJs) + ' to build a Docker image and run your app in a container.');
                break;
            }
        default:
            this.log.error('Not implemented yet.');
            break;
    }
}

// Docker Generator.
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
            default:
                // unknown.
                break;
        }

    },
    end: end
});

module.exports = DockerGenerator;