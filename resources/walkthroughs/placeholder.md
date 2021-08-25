## Add dockerfiles to workspace
A Dockerfile is a text document that contains all the commands a user would sequentially call on the command line to assemble an image. Open the command pallete (CTRL + Shift + P) and choose Docker:Add Dockerfiles to Workspace - We can show a gif of editing a dockerfile

## Build an image
An image is a read-only template with instructions for creating a Docker container. It can be based off a Dockerfile or another image. Navigate to your workspace and right-click your Dockerfile. Click Build Image. - Show a gif of right click build on a Dockerfile. **Most right-click actions are available from the command pallette**.

## Run a container
A container is a runnable instance of an image. Navigate to the Docker Explorer (Whale Icon), right-click on your image, and select **Run Container**. gif navigating to the docker explorer, right clicking on an image, select run container

## Use the Docker Explorer
The Docker extension makes it easy to build, manage, and deploy containerized applications. You can examine and manage Docker assets such as containers, images, volumes, networks, and container registries. Also, if the Azure Account extension[link to azure account extension in vs code] is installed, you can browse your Azure Container Registries as well.

The right-click menu provides access to commonly used commands for each type of asset.

Gif to show off Tool tips and files.

## Push an image to a container registry
The Docker Extension allows you to push your Docker image to Azure Container Registries, Docker Hub, AWS, GCP, and other third party providers. From the Images pane, right click on an image and select **Push**.

## Deploy to App Service
The Docker extension helps you deploy your containerized applications directly to Azure App Service to take advantage of a fully-managed platform in the cloud. To deploy an image to Azure App Service, the image must be uploaded to either Azure Container Registry or Docker Hub.

From the Registries pane, right click on an ACR or Docker Hub image and select Deploy Image to Azure App Service. Click on **Open Website** and now you have your container running on Azure!

Gif of right click on an image that is in a Registry - Deploy New app Service - Open Website

## Learn More
Great Job! You've now completed the Getting Started with Docker page. But don't stop here! There are plenty of ways to become more advanced with Docker Tools.

For example, check out how you can debug a container[https://code.visualstudio.com/docs/containers/debug-common] or run multiple containers at once using Compose[https://code.visualstudio.com/docs/containers/docker-compose].

Check out our guides and resources to make the most of the Docker Extension for VS Code!  (Direct them to the Help and feedback Panel)

### H3: Coolest guy ever
Regular text
![Coolest guy ever](https://avatars.githubusercontent.com/u/36966225?v=4)
