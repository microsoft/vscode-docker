import os
import sys

containerId = sys.argv[-1]
args = sys.argv[1:-1]

print("docker exec -d " + containerId + " python /pydbg/debugpy/launcher " + ' '.join(args))
os.execvp('docker', ['docker', 'exec', '-d', containerId, 'python', '/pydbg/debugpy/launcher'] + args)
