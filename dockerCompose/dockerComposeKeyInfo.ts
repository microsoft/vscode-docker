/*---------------------------------------------------------
 * Copyright (C) Microsoft Corporation. All rights reserved.
 *--------------------------------------------------------*/

import { ComposeVersionKeys, KeyInfo } from "../dockerExtension";

// Define the keys that are shared between all compose file versions,
// regardless of the major/minor version (e.g. v1-v2.1+).
// https://docs.docker.com/compose/yml/
const DOCKER_COMPOSE_SHARED_KEY_INFO: KeyInfo = {
    'build': (
        "Path to a directory containing a Dockerfile. When the value supplied is a relative path, it is interpreted as relative to the " +
        "location of the yml file itself. This directory is also the build context that is sent to the Docker daemon.\n\n" +
        "Compose will build and tag it with a generated name, and use that image thereafter."
    ),
    'cap_add': (
        "Add or drop container capabilities. See `man 7 capabilities` for a full list."
    ),
    'cap_drop': (
        "Add or drop container capabilities. See `man 7 capabilities` for a full list."
    ),
    'cgroup_parent': (
        "Specify an optional parent cgroup for the container."
    ),
    'command': (
        "Override the default command."
    ),
    'container_name': (
        "Specify custom container name, rather than a generated default name."
    ),
    'cpu_shares': (
        "CPU shares (relative weight)."
    ),
    'cpu_quota': (
        "Limit CPU CFS (Completely Fair Scheduler) quota."
    ),
    'cpuset': (
        "CPUs in which to allow execution."
    ),
    'devices': (
        "List of device mappings. Uses the same format as the `--device` docker client create option."
    ),
    'dns': (
        "Custom DNS servers. Can be a single value or a list."
    ),
    'dns_search': (
        "Custom DNS search domains. Can be a single value or a list."
    ),
    'dockerfile': (
        "Alternate Dockerfile. Compose will use an alternate file to build with. Using `dockerfile` together with `image` is not allowed. Attempting to do so results in an error."
    ),
    'domainname': (
        "Container domain name."
    ),
    'entrypoint': (
        "Overwrite the default ENTRYPOINT of the image."
    ),
    'env_file': (
        "Add environment variables from a file. Can be a single value or a list.\n\n" +
        "If you have specified a Compose file with `docker-compose -f FILE`, paths in `env_file` are relative to the directory that file is in.\n\n" +
        "Environment variables specified in `environment` override these values."
    ),
    'environment': (
        "Add environment variables. You can use either an array or a dictionary.\n\n" +
        "Environment variables with only a key are resolved to their values on the machine Compose is running on, which can be helpful for secret or host-specific values."
    ),
    'expose': (
        "Expose ports without publishing them to the host machine - they'll only be accessible to linked services. \n" +
        "Only the internal port can be specified."
    ),
    'extends': (
        "Extend another service, in the current file or another, optionally overriding configuration.\nYou can use `extends` on any service together with other configuration keys. " +
        "The `extends` value must be a dictionary defined with a required `service` and an optional `file` key."
    ),
    'external_links': (
        "Link to containers started outside this `docker-compose.yml` or even outside of Compose, especially for containers that " +
        "provide shared or common services. `external_links` follow " +
        "semantics similar to `links` when specifying both the container name and the link alias (`CONTAINER:ALIAS`)."
    ),
    'extra_hosts': (
        "Add hostname mappings. Use the same values as the docker client `--add-host` parameter."
    ),
    'hostname': (
        "Container host name."
    ),
    'image': (
        "Tag or partial image ID. Can be local or remote - Compose will attempt to pull if it doesn't exist locally."
    ),
    'ipc': (
        "IPC namespace to use."
    ),
    'labels': (
        "Add metadata to containers using Docker labels. You can either use an array or a dictionary.\n" +
        "It's recommended that you use reverse-DNS notation to prevent your labels from conflicting with those used by other software."
    ),
    'links': (
        "Link to containers in another service. Either specify both the service name and the link alias (`CONTAINER:ALIAS`), or " +
        "just the service name (which will also be used for the alias)."
    ),

    'mac_address': (
        "Container MAC address (e.g. 92:d0:c6:0a:29:33)."
    ),
    'mem_limit': (
        "Memory limit."
    ),
    'memswap_limit': (
        "Swap limit equal to memory plus swap: '-1' to enable unlimited swap."
    ),
    'mem_swappiness': (
        "Tune container memory swappiness (0 to 100) (default -1)."
    ),
    'pid': (
        "Sets the PID mode to the host PID mode. This turns on sharing between container and the host operating system the PID address space. " +
        "Containers launched with this flag will be able to access and manipulate other containers in the bare-metal machine's namespace and vise-versa."
    ),
    'ports': (
        "Expose ports. Either specify both ports (`HOST:CONTAINER`), or just the container port (a random host port will be chosen).\n\n" +
        "**Note**: When mapping ports in the `HOST:CONTAINER` format, you may experience erroneous results when using a container port " +
        "lower than 60, because YAML will parse numbers in the format `xx:yy` as sexagesimal (base 60). For this reason, we recommend " +
        "always explicitly specifying your port mappings as strings."
    ),
    'privileged': (
        "Give extended privileges to this container."
    ),
    'read_only': (
        "Mount the container's root filesystem as read only."
    ),
    'restart': (
        "Restart policy to apply when a container exits (default \"no\")."
    ),
    'security_opt': (
        "Override the default labeling scheme for each container."
    ),
    'shm_size': (
        "Size of /dev/shm, default value is 64MB."
    ),
    'stdin_open': (
        "Keep STDIN open even if not attached."
    ),
    'stop_signal': (
        "Signal to stop a container, SIGTERM by default."
    ),
    'tty': (
        "Allocate a pseudo-TTY."
    ),
    'ulimits': (
        "Override the default ulimits for a container. You can either specify a single limit as an integer or soft/hard limits as a mapping."
    ),
    'user': (
        "Username or UID (format: <name|uid>[:<group|gid>])."
    ),
    'version': (
        "Specify the compose format that this file conforms to. Omit this property to indicate v1, otherwise, set this to `2`."
    ),
    'volumes': (
        "Mount paths as volumes, optionally specifying a path on the host machine (`HOST:CONTAINER`), or an access mode (`HOST:CONTAINER:ro`)."
    ),
    'volume_driver': (
        "If you use a volume name (instead of a volume path), you may also specify a `volume_driver`."
    ),
    'volumes_from': (
        "Mount all of the volumes from another service or container."
    ),
    'working_dir': (
        "Working directory inside the container."
    )
};

// Define the keys which are unique to the v1 format, and were deprecated in v2+.
// https://github.com/docker/compose/blob/master/compose/config/config_schema_v1.json
const DOCKER_COMPOSE_V1_KEY_INFO: KeyInfo = {
    'log_driver': (
        "Specify a logging driver for the service's containers, as with the `--log-driver` option for docker run. The default value is json-file."
    ),
    'log_opt': (
        "Specify logging options with `log_opt` for the logging driver, as with the `--log-opt` option for docker run."
    ),
    'net': (
        "Networking mode. Use the same values as the docker client `--net` parameter."
    )
};

// Define the keys which are shared with all v2+ compose file versions, but weren't defined in v1.
// https://github.com/docker/compose/blob/master/compose/config/config_schema_v2.0.json
const DOCKER_COMPOSE_V2_KEY_INFO: KeyInfo = {
    // Added top-level properties
    'services': (
        "Specify the set of services that your app is composed of."
    ),
     // TODO: There is now a top-level and service-level volumes/networks setting which conflict.
     // This will be resolved when we add completion that understands file position context.
    'networks': (
        "Specifies the networks to be created as part of your app. This is analogous to running `docker network create`."
    ),
    'volumes': (
        "Specifies the volumes to be created as part of your app. This is analogous to running `docker volume create`."
    ),

    // Added service-level properties
    'depends_on': (
        "Specifies the names of services that this service depends on."
    ),
    'logging': (
        "Logging configuration for the service."
    ),
    'network_mode': (
        "Networking mode. Use the same values as the docker client `--net` parameter."
    ),
    'tmpfs': (
        "Mount a temporary file system inside the container. Can be a single value or a list."
    ),

    // Modified service-level properties
    'build': (
        "Configuration options that are applied at build time. Can be specified either as a string containing a path to the build context, or an object with the path specified under `context` and optionally `dockerfile` and `args`."
    ),

    // Added service/logging-level properties
    // TODO: The "driver" property could be a logging driver, a volume driver,
    // a network driver, or a network IPAM driver, so we should account for
    // that when we add context-based completion.
    'driver': (
        "Specifies the logging driver to use for the service’s container."
    ),
    'options': (
        'Options to pass to the specified logging driver, provided as key-value pairs.'
    ),

    // Added service/build-level properties
    'args': (
        "Add build arguments, which are environment variables accessible only during the build process."
    ),
    'context': (
        "Either a path to a directory containing a Dockerfile, or a url to a git repository. This directory will be used as the build context that is sent to the Docker daemon."
    ),

    // Added service/network-level properties
    'aliases': (
        "Alternative hostnames for this service on the network. Other containers on the same network can use either the service name or this alias to connect to one of the service’s containers."
    ),
    'ipv4_address': (
        "Specify a static IPv4 address for containers for this service when joining the network."
    ),
    'ipv6_address': (
        "Specify a static IPv6 address for containers for this service when joining the network."
    ),

    // Network-level properties
    'driver_opts': (
        "Specify a list of options as key-value pairs to pass to the driver. Those options are driver-dependent - consult the driver’s documentation for more information."
    ),
    'external': (
        "If set to true, specifies that this network has been created outside of Compose. `docker-compose up` will not attempt to create it, and will raise an error if it doesn’t exist."
    ),
    'ipam': (
        "Specify custom IPAM config"
    ),

    // Network/external-level properties
    // TODO: This would also apply to an external volume,
    // so we should account for that when we add context-based completion.
    'name': (
        "Specifies the name of the externally defined network."
    ),

    // Network/ipam-level properties
    'config': (
        "A list with zero or more config blocks."
    ),

    // Network/ipam/config-level properties
    'aux_addresses': (
        "Auxiliary IPv4 or IPv6 addresses used by Network driver, as a mapping from hostname to IP."
    ),
    'gateway': (
        "IPv4 or IPv6 gateway for the master subnet."
    ),
    'ip_range': (
        "Range of IPs from which to allocate container IPs."
    ),
    'subnet': (
        "Subnet in CIDR format that represents a network segment."
    ),

    // Volume-level properties
    // TODO: Top-level volumes support specifying the "driver",
    // "driver_opt", and "external" properties, but these are already
    // defined above. We can specialize these by adding context-based completion.
};

// Define the keys which were introduced in the v2.1 format.
// https://github.com/docker/compose/blob/master/compose/config/config_schema_v2.1.json
const DOCKER_COMPOSE_V2_1_KEY_INFO: KeyInfo = {
    // Added service-level properties
    'group_add': (
        "Specifies additional groups to join"
     ),
    'isolation': (
        "Container isolation technology"
    ),
    'oom_score_adj': (
        "Tune host's OOM preferences (-1000 to 1000)"
    ),

    // Added service/network-level properties
    'link_local_ips': (
        "List of IPv4/IPv6 link-local addresses for the container"
    ),

    // Added network-level properties
    'internal': (
        "Restrict external access to the network"
    ),
    'enable_ipv6': (
        "Enable IPv6 networking"
    )

    // Note that in v2.1, networks and volumes can now accept a "labels",
    // property, however, this label is already defined for services
    // in the v2.0 format, so we don't need to re-define it.
};

// Define the keys which were introduced in the v2.2 format.
// https://github.com/docker/compose/blob/master/compose/config/config_schema_v2.2.json
const DOCKER_COMPOSE_V2_2_KEY_INFO: KeyInfo = {
    // Added service-level properties
    'cpu_count': (
        "Number of usable CPUs (Windows only)"
     ),
    'cpu_percent': (
        "Usable percentage of the available CPUs (Windows only)"
    ),
    'cpus': (
        "CPU quota in number of CPUs"
    )
};

// Helper function that merges the specified version-specific keys with the shared
// keys, in order to create a complete schema for a specic version.
function mergeWithSharedKeys(...versions: KeyInfo[]): KeyInfo {
    return Object.assign({}, DOCKER_COMPOSE_SHARED_KEY_INFO, ...versions);
}
    
export default <ComposeVersionKeys>{
    v1: mergeWithSharedKeys(DOCKER_COMPOSE_V1_KEY_INFO),
    v2: mergeWithSharedKeys(DOCKER_COMPOSE_V2_KEY_INFO),
    "v2.1": mergeWithSharedKeys(DOCKER_COMPOSE_V2_KEY_INFO, DOCKER_COMPOSE_V2_1_KEY_INFO),
    "v2.2": mergeWithSharedKeys(DOCKER_COMPOSE_V2_KEY_INFO, DOCKER_COMPOSE_V2_1_KEY_INFO, DOCKER_COMPOSE_V2_2_KEY_INFO),
    All: mergeWithSharedKeys(DOCKER_COMPOSE_V1_KEY_INFO, DOCKER_COMPOSE_V2_KEY_INFO, DOCKER_COMPOSE_V2_1_KEY_INFO, DOCKER_COMPOSE_V2_2_KEY_INFO)
};