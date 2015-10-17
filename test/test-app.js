'use strict';

var path = require('path');
var assert = require('yeoman-generator').assert;
var helpers = require('yeoman-generator').test;
var os = require('os');

describe('docker:app', function () {
  before(function (done) {
    helpers.run(path.join(__dirname, '../generators/app'))
      .withPrompts({ type:"dockerfile"})
      .on('end', done);
  });

  it('creates files', function () {
    assert.file([
      'Dockerfile'
    ]);
  });
});
