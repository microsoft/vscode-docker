/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See LICENSE in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { expect } from 'chai';
import { parseDockerLikeImageName } from '../clients/DockerClientBase/parseDockerLikeImageName';

describe('parseDockerLikeImageName', () => {
    describe('Should parse valid image names', () => {
        it('Should parse those without a registry or tag', () => {
            expect(parseDockerLikeImageName('alpine')).to.deep.equal({
                originalName: 'alpine',
                image: 'alpine',
                tag: undefined,
                digest: undefined,
                registry: undefined,
            });

            expect(parseDockerLikeImageName('hello-world')).to.deep.equal({
                originalName: 'hello-world',
                image: 'hello-world',
                tag: undefined,
                digest: undefined,
                registry: undefined,
            });

            expect(parseDockerLikeImageName('hello_world')).to.deep.equal({
                originalName: 'hello_world',
                image: 'hello_world',
                tag: undefined,
                digest: undefined,
                registry: undefined,
            });

            expect(parseDockerLikeImageName('library/alpine')).to.deep.equal({
                originalName: 'library/alpine',
                image: 'library/alpine',
                tag: undefined,
                digest: undefined,
                registry: undefined,
            });
        });

        it('Should parse those without a registry', () => {
            expect(parseDockerLikeImageName('alpine:latest')).to.deep.equal({
                originalName: 'alpine:latest',
                image: 'alpine',
                tag: 'latest',
                digest: undefined,
                registry: undefined,
            });

            expect(parseDockerLikeImageName('alpine:5')).to.deep.equal({
                originalName: 'alpine:5',
                image: 'alpine',
                tag: '5',
                digest: undefined,
                registry: undefined,
            });

            expect(parseDockerLikeImageName('library/alpine:5')).to.deep.equal({
                originalName: 'library/alpine:5',
                image: 'library/alpine',
                tag: '5',
                digest: undefined,
                registry: undefined,
            });
        });

        it('Should parse those with a digest', () => {
            expect(parseDockerLikeImageName('kindest/node:v1.24.0@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e')).to.deep.equal({
                originalName: 'kindest/node:v1.24.0@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                image: 'kindest/node',
                tag: 'v1.24.0',
                digest: 'sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                registry: undefined,
            });
        });

        it('Should parse those with all parts', () => {
            expect(parseDockerLikeImageName('docker.io/library/alpine:latest')).to.deep.equal({
                originalName: 'docker.io/library/alpine:latest',
                image: 'library/alpine',
                tag: 'latest',
                digest: undefined,
                registry: 'docker.io',
            });

            expect(parseDockerLikeImageName('localhost/alpine:latest')).to.deep.equal({
                originalName: 'localhost/alpine:latest',
                image: 'alpine',
                tag: 'latest',
                digest: undefined,
                registry: 'localhost',
            });

            expect(parseDockerLikeImageName('with-a.port:5000/library/alpine:latest')).to.deep.equal({
                originalName: 'with-a.port:5000/library/alpine:latest',
                image: 'library/alpine',
                tag: 'latest',
                digest: undefined,
                registry: 'with-a.port:5000',
            });

            expect(parseDockerLikeImageName('tldwithport:5000/library/alpine:latest')).to.deep.equal({
                originalName: 'tldwithport:5000/library/alpine:latest',
                image: 'library/alpine',
                tag: 'latest',
                digest: undefined,
                registry: 'tldwithport:5000',
            });

            expect(parseDockerLikeImageName('1.2.3.4:5000/library/alpine:latest')).to.deep.equal({
                originalName: '1.2.3.4:5000/library/alpine:latest',
                image: 'library/alpine',
                tag: 'latest',
                digest: undefined,
                registry: '1.2.3.4:5000',
            });

            expect(parseDockerLikeImageName('localhost:5000/alpine:latest')).to.deep.equal({
                originalName: 'localhost:5000/alpine:latest',
                image: 'alpine',
                tag: 'latest',
                digest: undefined,
                registry: 'localhost:5000',
            });

            expect(parseDockerLikeImageName('with-a.port:5000/library/alpine:latest@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e')).to.deep.equal({
                originalName: 'with-a.port:5000/library/alpine:latest@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                image: 'library/alpine',
                tag: 'latest',
                digest: 'sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                registry: 'with-a.port:5000',
            });

            expect(parseDockerLikeImageName('1.2.3.4:5000/library/alpine:latest@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e')).to.deep.equal({
                originalName: '1.2.3.4:5000/library/alpine:latest@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                image: 'library/alpine',
                tag: 'latest',
                digest: 'sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                registry: '1.2.3.4:5000',
            });

            expect(parseDockerLikeImageName('localhost:5000/alpine:latest@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e')).to.deep.equal({
                originalName: 'localhost:5000/alpine:latest@sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                image: 'alpine',
                tag: 'latest',
                digest: 'sha256:0866296e693efe1fed79d5e6c7af8df71fc73ae45e3679af05342239cdc5bc8e',
                registry: 'localhost:5000',
            });
        });
    });

    it('Should return empty on <none> image names', () => {
        expect(parseDockerLikeImageName('<none>:<none>')).to.deep.equal({
            originalName: '<none>:<none>',
            image: undefined,
            tag: undefined,
            digest: undefined,
            registry: undefined,
        });

        expect(parseDockerLikeImageName('<none>')).to.deep.equal({
            originalName: '<none>',
            image: undefined,
            tag: undefined,
            digest: undefined,
            registry: undefined,
        });

        expect(parseDockerLikeImageName('alpine:<none>')).to.deep.equal({
            originalName: 'alpine:<none>',
            image: 'alpine',
            tag: undefined,
            digest: undefined,
            registry: undefined,
        });
    });

    it('Should return empty on empty image names', () => {
        expect(parseDockerLikeImageName(undefined)).to.deep.equal({
            originalName: undefined,
        });

        expect(parseDockerLikeImageName('')).to.deep.equal({
            originalName: '',
        });
    });

    it('Should throw on invalid image names', () => {
        expect(() => parseDockerLikeImageName('notvalid:')).to.throw();
        expect(() => parseDockerLikeImageName(':notvalid')).to.throw();
        expect(() => parseDockerLikeImageName('not$valid:latest')).to.throw();
    });
});
