# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See LICENSE.md in the project root for license information.

# This acts as a simple launcher for debugpy that only redirects the args to the actual launcher inside the container
import os, sys

containerExePath = sys.argv[-2] # Container EXE path is the second-to-last arg
containerId = sys.argv[-1] # Container id is the last arg
args = sys.argv[1:-2] # The remaining args will be given to the launcher

# If the adapterHost is only a port number, then append the default DNS name 'host.docker.internal'
adapterHost = args[0]

if adapterHost.isnumeric():
    args[0] = 'host.docker.internal:' + adapterHost

dockerExecArgs = [containerExePath, 'exec', '-d', containerId, 'python3', '/debugpy/launcher'] + args

command = ' '.join(dockerExecArgs)

print(command)
os.system(command)
