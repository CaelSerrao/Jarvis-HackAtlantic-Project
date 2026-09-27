class AgentToolRegistry:

    def __init__(self):
        self.tools = {}


    def register(
        self,
        name,
        description,
        parameters,
        handler
    ):
        self.tools[name] = {
            "description": description,
            "parameters": parameters,
            "handler": handler
        }


    def get_schemas(self):
        schemas = []

        for name, tool in self.tools.items():

            schemas.append({
                "type": "function",

                "function": {
                    "name": name,
                    "description":
                        tool["description"],
                    "parameters":
                        tool["parameters"]
                }
            })

        return schemas


    def execute(
        self,
        name,
        arguments
    ):
        if name not in self.tools:
            raise ValueError(
                f"Agent tool '{name}' "
                f"is not registered."
            )

        handler = self.tools[
            name
        ]["handler"]

        return handler(arguments)