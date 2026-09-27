class HostPrimitiveRegistry:

    def __init__(self):
        self.primitives = {}


    def register(
        self,
        name,
        description,
        parameters,
        permissions,
        handler
    ):
        self.primitives[name] = {
            "description": description,
            "parameters": parameters,
            "permissions": permissions,
            "handler": handler
        }


    def execute(
        self,
        name,
        arguments,
        context=None
    ):
        if name not in self.primitives:
            raise ValueError(
                f"Host primitive '{name}' "
                "is not registered."
            )

        handler = self.primitives[
            name
        ]["handler"]

        return handler(
            arguments,
            context or {}
        )


    def get_schemas(self):
        schemas = []

        for name, primitive in (
            self.primitives.items()
        ):

            schemas.append({
                "name": name,
                "description":
                    primitive["description"],
                "parameters":
                    primitive["parameters"],
                "permissions":
                    primitive["permissions"]
            })

        return schemas


    def get_names(self):
        return set(
            self.primitives.keys()
        )