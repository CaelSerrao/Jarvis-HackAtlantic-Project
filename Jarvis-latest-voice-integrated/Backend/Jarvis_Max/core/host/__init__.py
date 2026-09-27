from core.host.primitive_registry import (
    HostPrimitiveRegistry
)

from core.host.filesystem import (
    register_filesystem_primitives
)

from core.host.applications import (
    register_application_primitives
)

from core.host.system import (
    register_system_primitives
)


def build_host_registry():

    registry = (
        HostPrimitiveRegistry()
    )

    register_filesystem_primitives(
        registry
    )

    register_application_primitives(
        registry
    )

    register_system_primitives(
        registry
    )

    return registry