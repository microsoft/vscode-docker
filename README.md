# Generator-docker

[![Package version][npmVersionBadge]][npmLink]
[![CI Status][ciStatusBadge]][ciLink]
[![Downloads][npmDownloadsBadge]][npmLink]

This generator creates a Dockerfile and a script (`dockerTask.sh` or `dockerTask.cmd`) that helps you build and run your project inside of a Docker container. The following project types are currently supported:
- ASP.NET 5.0
- Go 
- Node.js

### Quick demo
[![See the generator in action][yovideoScreenshot]][yovideo]]

## Installing

Prerequisites: 
- [Node.js][nodejsSite]
- [Yo generator][yoSite]

Install the Docker generator:
```bash
npm install -g generator-docker
```

Run the generator in the same folder that your project is in:
```bash
yo docker
```

## Contributing
See [CONTRIBUTING][contributingLink] for more guidelines.

## License
See [LICENSE][licenseLink] for full license text.

[licenseLink]:https://github.com/Microsoft/generator-docker/blob/master/LICENSE
[contributingLink]: https://github.com/Microsoft/generator-docker/blob/master/CONTRIBUTING.md
[npmLink]:https://www.npmjs.com/package/generator-docker
[npmVersionBadge]:https://img.shields.io/npm/v/generator-docker.svg
[npmDownloadsBadge]:https://img.shields.io/npm/dm/generator-docker.svg
[ciStatusBadge]:https://circleci.com/gh/Microsoft/generator-docker.svg?style=shield&circle-token=a1a705d77cd91720fdd8b021e17c41bbabc4b00d
[ciLink]: https://circleci.com/gh/Microsoft/generator-docker
[yovideo]: https://youtu.be/p1F-398z1_4
[yovideoScreenshot]: http://img.youtube.com/vi/p1F-398z1_4/0.jpg
[nodejsSite]: https://nodejs.org/en/
[yoSite]: http://yeoman.io/