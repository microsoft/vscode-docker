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

var DockerGenerator = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);
    this.ScriptNameNodeJs = 'dockerTask.sh';
  },

  init: function () {
    this.log(yosay('Welcome to the ' + chalk.red('Docker') + ' generator!' + chalk.green('\nLet\'s add Docker magic to your app!')));
  },

  askFor: function () {
    var done = this.async();
    var prompts = [{
      type: 'input',
      name: 'maintainer',
      message: 'What\'s your GitHub user name?',
      default: 'someuser'
    },
      {
        type: 'list',
        name: 'type',
        message: 'What language is your project using?',
        choices: [{
          name: 'Node.js',
          value: 'nodejs'
        },
          {
            name: 'Golang',
            value: 'golang'
          }]
      },
      {
        type: 'confirm',
        name: 'addnodemon',
        message: 'Do you want to use Nodemon?',
        when: function (answers) {
          return answers.type === 'nodejs';
        }
      },
      {
        type: 'input',
        name: 'portNumber',
        message: 'Which port is your app running on?',
        default: "3000",
        when: function (answers) {
          return answers.type === 'nodejs';
        }
      },
      {
        type: 'input',
        name: 'imageName',
        message: 'How do you want to name your image?',
        default: process.cwd().split(path.sep).pop() + '_image',
      },
      {
        type: 'input',
        name: 'dockerHostName',
        message: 'What\'s the name of your docker host machine?',
        default: 'default',
      }
    ];

    this.prompt(prompts, function (props) {
      this.projectType = props.type;
      this.maintainer = props.maintainer;
      this.addnodemon = props.addnodemon;
      this.portNumber = props.portNumber;
      this.imageName = props.imageName;
      this.dockerHostName = props.dockerHostName;
      done();
    }.bind(this));
  },

  writing: function () {
    this.sourceRoot(path.join(__dirname, './templates'));

    switch (this.projectType) {
      case 'nodejs': {
        this._handleNodeJs();
        break;
      }
      case 'golang': {
        this._handleGolang();
        break;
      }
      default: 
        // unknown.
        break;
    }
  },

  _handleGolang: function () {
    // Nothing here yet.
  },

  _handleNodeJs: function () {
    // Add the Nodemon command if selected.
    if (this.addnodemon) {
      this.nodeMonCommand = 'RUN npm install nodemon -g';
    }
    else {
      this.nodeMonCommand = '';
    }

    this.fs.copyTpl(
      this.templatePath('_Dockerfile.nodejs'),
      this.destinationPath('Dockerfile'),
      {
        imageName: 'node',
        maintainer: this.maintainer,
        nodeMonCommand: this.nodeMonCommand,
        portNumber: this.portNumber,
      });

    this.fs.copyTpl(
      this.templatePath('_dockerTaskNodejs.sh'),
      this.destinationPath(this.ScriptNameNodeJs),
      {
        imageName: this.imageName,
        portNumber: this.portNumber,
        dockerHostName: this.dockerHostName
      });
  },

  _makeBuildScriptExecutable: function () {
    var done = this.async();
    exec('chmod +x ' + this.ScriptNameNodeJs, function (err) {
      if (err) {
        this.log.error(err);
        this.log.error('Error making script executable. Run ' + chalk.bold('chmod +x ' + this.ScriptNameNodeJs) + ' manually.');
        this.error = true;
      }
      done();
    }.bind(this));
  },

  end: function () {
    if (this.error) {
      this.log(chalk.red(':( errors occured.'));
    }
    
    switch (this.projectType) {
      case 'nodejs': {
        this._makeBuildScriptExecutable();
        this.log('Your project is now ready to run in a Docker container!');
        this.log('Run ' + chalk.green(this.ScriptNameNodeJs) + ' to build a Docker image and run your app in a container.');
        break;
      }
      default:
        this.log.error('Not implemented yet.');
        break;
    }
  }
});

module.exports = DockerGenerator;