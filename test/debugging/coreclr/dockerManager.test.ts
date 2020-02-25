/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import assert = require("assert");
import { DockerBuildImageOptions } from "../../../extension.bundle";
import { compareBuildImageOptions } from "../../../extension.bundle";

suite('(unit) debugging/coreclr/dockerManager', () => {
    suite('compareBuildImageOptions', () => {
        function testComparison(name: string, options1: DockerBuildImageOptions | undefined, options2: DockerBuildImageOptions | undefined, expected: boolean, message: string) {
            test(name, () => assert.equal(compareBuildImageOptions(options1, options2), expected, message));
        }

        function testComparisonOfProperty<U extends keyof DockerBuildImageOptions>(property: U, included: boolean = true) {
            suite(property, () => {
                test('Options undefined', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = undefined;

                    const options2: DockerBuildImageOptions = undefined;

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Property undefined equates to options undefined.');
                });

                test('Property unspecified', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = undefined;

                    const options2: DockerBuildImageOptions = {};

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Property undefined equates to property unspecified.');
                });

                test('Properties equal', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = <any>'value';

                    const options2: DockerBuildImageOptions = {};

                    options2[property] = <any>'value';

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Equal properties should be equal.');
                });

                test('Properties different', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = <any>'value1';

                    const options2: DockerBuildImageOptions = {};

                    options2[property] = <any>'value2';

                    assert.equal(compareBuildImageOptions(options1, options2), !included, 'Different properties should be unequal.');
                });
            });
        }

        function testComparisonOfDictionary<U extends keyof DockerBuildImageOptions>(property: U, included: boolean = true) {
            suite(property, () => {
                test('Options undefined', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = undefined;

                    const options2: DockerBuildImageOptions = undefined;

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Dictionary undefined equates to options undefined.');
                });

                test('Dictionary unspecified', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = undefined;

                    const options2: DockerBuildImageOptions = {};

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Dictionary undefined equates to dictionary unspecified.');
                });

                test('Dictionary empty', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = <any>{};

                    const options2: DockerBuildImageOptions = {};

                    options2[property] = <any>{};

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Empty dictionaries should be equal.');
                });

                test('Dictionary equal', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = <any>{ arg1: 'value1', arg2: 'value2' };

                    const options2: DockerBuildImageOptions = {};

                    options2[property] = <any>{ arg1: 'value1', arg2: 'value2' };

                    assert.equal(compareBuildImageOptions(options1, options2), true, 'Equal dictionaries should be equal.');
                });

                test('Dictionary different keys', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = <any>{ arg1: 'value1', arg2: 'value2' };

                    const options2: DockerBuildImageOptions = {};

                    options2[property] = <any>{ arg2: 'value2', arg3: 'value3' };

                    assert.equal(compareBuildImageOptions(options1, options2), !included, 'Different properties should be unequal.');
                });

                test('Dictionary different values', () => {
                    const options1: DockerBuildImageOptions = {};

                    options1[property] = <any>{ arg1: 'value1', arg2: 'value2' };

                    const options2: DockerBuildImageOptions = {};

                    options2[property] = <any>{ arg1: 'value1', arg2: 'value3' };

                    assert.equal(compareBuildImageOptions(options1, options2), !included, 'Different properties should be unequal.');
                });
            });
        }

        testComparison('Both undefined', undefined, undefined, true, 'Both being undefined are considered equal.');
        testComparison('One undefined, one empty', undefined, {}, true, 'Undefined and empty are considered equal.');
        testComparison('Both empty', {}, {}, true, 'Both empty are considered equal.');

        testComparisonOfProperty('context');
        testComparisonOfProperty('dockerfile', false);
        testComparisonOfProperty('tag');

        testComparisonOfDictionary('args');
        testComparisonOfDictionary('labels');
    });
});
