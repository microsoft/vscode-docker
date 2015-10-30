@echo off 
set imageName="<%= imageName %>"
set containerPort=<%= portNumber %>
set dockerHostName="<%= dockerHostName %>"
set publicPort=<%= portNumber %>

if /I "%1" == "build" (
    call :buildImage
    goto :eof
)

if /I "%1" == "run" (
    call :runContainer
    goto :eof
)

if /I "%1" == "clean" (
    call :cleanAll
    goto :eof
)

if /I "%1" == "buildrun" (
    call :buildImage
    call :runContainer
    goto :eof
)

REM By default, show usage.
call :showUsage
goto :eof

REM Kills all running containers of an image and then removes them.
:cleanAll
    REM List all running containers that use %imageName%, kill them and then remove them.
    FOR /F "tokens=1,2" %%a IN ('docker ps -a') DO (
        if "%%b" == %imageName% (
            docker kill %%a
            docker rm %%a
        )
    )
goto :eof

REM Builds the Docker image.
:buildImage
    echo Building the image %imageName%.
    docker build -t %imageName% .
goto :eof

REM Runs the container.
:runContainer
    REM Check if container is already running, stop it and run a new one.
    FOR /F "tokens=1,2" %%a IN ('docker ps') DO (
        if "%%b" == %imageName% (
            docker kill %%a
        )
    )
    REM Create a container from the image.
    <%= containerRunCommand %>

    REM Open the site.    
    FOR /F %%i IN (' "docker-machine ip %dockerHostName%" ') do (
       set ipValue=%%i
    )

    start http://%ipValue%:%publicPort%
goto :eof

REM Shows the usage for the script.
:showUsage
    echo Description:
    echo     Builds and runs a Docker image.
    echo.
    echo Options:
    echo     build: Builds a Docker image (%imageName%).
    echo     run: Runs a container based on an existing Docker image (%imageName%).
    echo     buildrun: Builds a Docker image and runs the container.
    echo     clean: Removes the image %imageName% and kills all containers based on that image.
    echo Example:
    echo     dockerTask.cmd build
    echo 
    echo     This will:
    echo         Build a Docker image named %imageName%.
:eof