from abc import ABC, abstractmethod


class AgentProvider(ABC):

    @abstractmethod
    def chat(
        self,
        messages,
        tools=None
    ):
        pass