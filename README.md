# Yeoman Docker Generator

 [![CI Status](https://circleci.com/gh/Microsoft/generator-docker.svg?style=shield&circle-token=:circle-token)]

## Developing & testing
After making changes to the code, run:
```bash
npm link
```

And then run the generator:
```bash
yo docker
```

Run the following command from the root folder of the project:
```bash
mocha
```

## Publishing
To publish a new version of the docker generator, increase the generator version and run:

```bash
npm publish
```

## Installing
To install generator-docker from npm, run:

```bash
npm install -g generator-docker
```

Finally, initiate the generator:

```bash
yo docker
```

## License

MIT