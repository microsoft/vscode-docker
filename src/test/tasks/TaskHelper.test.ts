/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE.md in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as assert from 'assert';
import { recursiveFindTaskByType } from '../../tasks/TaskHelper';
import { TaskDefinitionBase } from '../../tasks/TaskDefinitionBase';
import { DebugConfigurationBase } from '../../debugging/DockerDebugConfigurationBase';

suite('(unit) tasks/TaskHelper/recursiveFindTaskByType', async () => {

    const simple: TaskDefinitionBase[] = [
        {
            type: 'docker-run',
            label: 'My Docker-Run Task',
            dependsOn: ['My Docker-Build Task']
        },
        {
            type: 'docker-build',
            label: 'My Docker-Build Task'
        }
    ];

    const simpleConfig: DebugConfigurationBase = {
        type: 'docker-launch',
        request: 'launch',
        name: 'My debug config',
        preLaunchTask: 'My Docker-Run Task'
    };

    const multilayer: TaskDefinitionBase[] = [
        {
            type: 'other',
            label: 'other task',
            dependsOn: ['My Docker-Run Task']
        },
        {
            type: 'docker-run',
            label: 'My Docker-Run Task',
            dependsOn: ['another task']
        },
        {
            type: 'other',
            label: 'another task',
            dependsOn: ['My Docker-Build Task']
        },
        {
            type: 'docker-build',
            label: 'My Docker-Build Task',
        }
    ];

    const multilayerConfig: DebugConfigurationBase = {
        type: 'docker-launch',
        request: 'launch',
        name: 'My debug config',
        preLaunchTask: 'other task'
    };

    const missing: TaskDefinitionBase[] = [
        {
            type: 'docker-run',
            label: 'My Docker-Run Task',
            dependsOn: ['another task']
        },
    ];

    const dependsOnType: TaskDefinitionBase[] = [
        {
            type: 'docker-run',
            label: 'My Docker-Run Task',
            dependsOn: { type: 'docker-build' }
        },
        {
            type: 'docker-build',
            label: 'My Docker-Build Task'
        }
    ];

    test('simple', async () => {
        assert.equal(await recursiveFindTaskByType(simple, 'docker-build', simpleConfig), simple[1]);
        assert.equal(await recursiveFindTaskByType(simple, 'docker-build', simple[0]), simple[1]);

        assert.equal(await recursiveFindTaskByType(simple, 'docker-run', simpleConfig), simple[0]);
    });

    test('multilayer', async () => {
        assert.equal(await recursiveFindTaskByType(multilayer, 'docker-build', multilayerConfig), multilayer[3]);
        assert.equal(await recursiveFindTaskByType(multilayer, 'docker-build', multilayer[0]), multilayer[3]);

        assert.equal(await recursiveFindTaskByType(multilayer, 'docker-run', multilayerConfig), multilayer[1]);
        assert.equal(await recursiveFindTaskByType(multilayer, 'docker-run', multilayer[0]), multilayer[1]);
    });

    test('missing', async () => {
        assert.equal(await recursiveFindTaskByType(missing, 'docker-build', simpleConfig), undefined);
        assert.equal(await recursiveFindTaskByType(missing, 'docker-build', missing[0]), undefined);
    });

    test('dependsOnType', async () => {
        assert.equal(await recursiveFindTaskByType(dependsOnType, 'docker-build', simpleConfig), dependsOnType[1]);
        assert.equal(await recursiveFindTaskByType(dependsOnType, 'docker-build', dependsOnType[0]), dependsOnType[1]);
    });
});
