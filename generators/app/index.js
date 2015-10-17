'use strict';
var yeoman = require('yeoman-generator');
var chalk = require('chalk');
var yosay = require('yosay');
var path = require('path');

var DockerGenerator = yeoman.generators.Base.extend({
  constructor: function () {
    yeoman.generators.Base.apply(this, arguments);  
  }, 
  
  init: function () {
    this.log(yosay('Welcome to the ' + chalk.red('Docker') + ' generator!'));
    this.templatedata = {};
  },
  
  initializing: function () {
  },
  
  initForTest: function(artifactType) {
     this.type = artifactType;
  },
  
  askFor: function () {
    var done = this.async(); 
    
    var prompts = [{
      type: 'list',
      name: 'type',
      message: 'Which Docker artifact do you want to create?',
      choices: [
        {
          name: 'Docker file (' + chalk.bold('Dockerfile') + ')',
          value: 'dockerfile'
        },
        {
          name: 'Compose file (' + chalk.bold('Docker-compose.yml') + ')',
          value: 'composefile'
        }
      ]
    }];
    
    this.prompt(prompts, function (props) {
      this.type = props.type;
      done();
    }.bind(this));
  },

  writing: function () {
      this.sourceRoot(path.join(__dirname, './templates'));
      
      switch (this.type) {
        case 'dockerfile':
          this.copy(this.sourceRoot() + '/_Dockerfile', 'Dockerfile');
          break; 
        case 'composefile':
          break; 
        default: 
          // unknown.
          break; 
      }
  },

  install: function () {
    // this.installDependencies();
  }, 
  
  end: function () {
    switch (this.type) {
      case 'dockerfile':  
        this.log('Dockerfile was added to your project.');
        break;
      case 'composefile':
        this.log('Oops, nothing there yet :(');
        break;
      default: 
        break; 
    }
  }
});

module.exports = DockerGenerator;