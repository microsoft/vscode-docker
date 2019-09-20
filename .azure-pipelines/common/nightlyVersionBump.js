/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Adapted from Remote SSH - Nightly extension

const fse = require('fs-extra');

// update name, publisher, and description
const json = fse.readJsonSync('./package.json');

// calculate version
const date = new Date();
const monthMinutes = (date.getDate() - 1) * 24 * 60 + date.getHours() * 60 + date.getMinutes();
const version = `${date.getFullYear()}.${date.getMonth() + 1}.${monthMinutes}`;

const jsonMixin = fse.readJsonSync('./package.nightly.json');

const nightlyPackageJson = {
    ...json,
    ...jsonMixin,
    ...{
        version
    }
};

console.log('Rewritten attributes: ');
console.log('  name: ' + nightlyPackageJson.name);
console.log('  version: ' + nightlyPackageJson.version);
console.log('  displayName: ' + nightlyPackageJson.displayName);
console.log('  description: ' + nightlyPackageJson.description);

fse.writeFileSync('./package.json', JSON.stringify(nightlyPackageJson));
