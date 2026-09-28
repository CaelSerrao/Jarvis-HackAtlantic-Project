import threading
import uuid


class ApprovalBroker:

    def __init__(
        self,
        event_handler=None,
        timeout=300
    ):
        self.event_handler = event_handler
        self.timeout = timeout

        self.pending = {}
        self.lock = threading.Lock()


    def request(
        self,
        manifest
    ):
        approval_id = str(
            uuid.uuid4()
        )

        approval = {
            "id": approval_id,
            "manifest": manifest,
            "event": threading.Event(),
            "approved": None
        }


        with self.lock:

            self.pending[
                approval_id
            ] = approval


        if self.event_handler:

            self.event_handler({
                "type":
                    "capability_approval_required",

                "data": {
                    "approval_id":
                        approval_id,

                    "name":
                        manifest.get(
                            "name"
                        ),

                    "description":
                        manifest.get(
                            "description"
                        ),

                    "risk_level":
                        manifest.get(
                            "risk_level"
                        ),

                    "permissions":
                        manifest.get(
                            "permissions",
                            []
                        )
                }
            })


        # Jarvis is running in a worker thread,
        # so blocking here will NOT freeze FastAPI.
        approval[
            "event"
        ].wait(
            timeout=self.timeout
        )


        approved = approval[
            "approved"
        ]


        with self.lock:

            self.pending.pop(
                approval_id,
                None
            )


        return approved is True


    def resolve(
        self,
        approval_id,
        approved
    ):
        with self.lock:

            approval = self.pending.get(
                approval_id
            )


            if not approval:

                return {
                    "success": False,
                    "error": (
                        "Approval request "
                        "was not found."
                    )
                }


            approval[
                "approved"
            ] = bool(
                approved
            )

            approval[
                "event"
            ].set()


        return {
            "success": True,
            "approval_id": approval_id,
            "approved": bool(
                approved
            )
        }


    def list_pending(
        self
    ):
        with self.lock:

            return [
                {
                    "approval_id":
                        approval_id,

                    "name":
                        item[
                            "manifest"
                        ].get(
                            "name"
                        ),

                    "description":
                        item[
                            "manifest"
                        ].get(
                            "description"
                        ),

                    "risk_level":
                        item[
                            "manifest"
                        ].get(
                            "risk_level"
                        ),

                    "permissions":
                        item[
                            "manifest"
                        ].get(
                            "permissions",
                            []
                        )
                }

                for approval_id, item
                in self.pending.items()
            ]