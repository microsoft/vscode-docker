# Copyright (c) Microsoft Corporation. All rights reserved.
# Licensed under the MIT License. See LICENSE.md in the project root for license information.

# This acts as a simple launcher for debugpy that only redirects the args to the actual launcher inside the container
import os, sys

# Container id is the last arg
containerId = sys.argv[-1]
args = sys.argv[1:-1]

adapterHost = args[0]

if ':' not in adapterHost:
    args[0] = 'host.docker.internal:' + adapterHost

print("docker exec -d " + containerId + " python /pydbg/debugpy/launcher " + ' '.join(args))
os.execvp('docker', ['docker', 'exec', '-d', containerId, 'python', '/pydbg/debugpy/launcher'] + args)
