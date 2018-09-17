# Azure Docker API (Preview)

The following extension commands are supported for programmatic use. If a parameter is not specified, the user will be prompted for the value. You must list 'PeterJausovec.vscode-docker' under the 'extensionDependencies' section of your package.json to ensure these apis are available to your extension.  (**Note: the publisher will soon be changing, and although we will attempt to keep this change from affecting dependents, it would be good to contact us if you are using this API so we can inform you of the change.**)

> NOTE: The docker extension is still in preview and the APIs are subject to change.

Commands:

* [Configure (Add Docker Files to Workspace)](#configure-add-docker-files-to-workspace)

## Configure (Add Docker Files to Workspace)

### Command ID: `vscode-docker.api.configure`

### Parameters

|Name|Type|Description|
|---|---|---|
|options|ConfigureApiOptions|Options for the command

Where ConfigureApiOptions and related types are defined as follows:

```typescript
interface ConfigureApiOptions {
    /**
     * Root folder from which to search for .csproj, package.json, .pom or .gradle files
     */
    rootPath: string;

    /**
     * Output folder for the docker files. This should normally be the same as rootPath or a descendent of it.
     */
    outputFolder: string;

    /**
     * Platform (optional)
     */
    platform?: Platform;

    /**
     * Port to expose (optional)
     */
    port?: string;

    /**
     * The OS for the images (optional). Currently only used for .NET platforms.
     */
    os?: OS;
}

type OS = 'Windows' | 'Linux';

export type Platform =
    'Go' |
    'Java' |
    '.NET Core Console' |
    'ASP.NET Core' |
    'Node.js' |
    'Python' |
    'Ruby' |
    'Other';
```

### Example Usage

```typescript
await vscode.commands.executeCommand('vscode-docker.api.configure', {
    // (Platform and OS [if needed] will be
    // requested from the user, since they
    // aren't specified)
    rootPath: '/src/myproject',
    outputFolder: '/src/myproject/service1',
    port: '8001'
});
```
