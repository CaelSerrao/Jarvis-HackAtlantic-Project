import asyncio
import threading


class EventBroker:

    def __init__(
        self
    ):
        self.subscribers = []
        self.lock = threading.Lock()


    def subscribe(
        self
    ):
        loop = (
            asyncio.get_running_loop()
        )

        queue = asyncio.Queue()

        subscriber = {
            "loop": loop,
            "queue": queue
        }

        with self.lock:
            self.subscribers.append(
                subscriber
            )

        return subscriber


    def unsubscribe(
        self,
        subscriber
    ):
        with self.lock:

            if subscriber in self.subscribers:

                self.subscribers.remove(
                    subscriber
                )


    def publish(
        self,
        event
    ):
        with self.lock:
            subscribers = list(
                self.subscribers
            )

        for subscriber in subscribers:

            loop = subscriber[
                "loop"
            ]

            queue = subscriber[
                "queue"
            ]

            try:
                loop.call_soon_threadsafe(
                    queue.put_nowait,
                    event
                )

            except RuntimeError:
                pass