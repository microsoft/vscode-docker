# =========================
# FILE: HELL.PY
# FICTIONAL SIMULATION SYSTEM
# =========================
#
# WARNING:
# This system is a fictional audit/log simulation.
# It does NOT interact with real users, accounts, networks, or data.
#
# Any “entities” inside this file are simulated objects used only
# for storytelling, game logic, or testing environments.
#
# Unauthorized real-world use, impersonation, tracking, or harm-based
# behavior is NOT supported or implemented in this system.
#
# All events are artificial and manually entered for simulation purposes only.
# =========================


from datetime import datetime


class HellFile:
    """
    Fictional Underworld Audit / Log System
    (Simulation only — no real-world tracking)
    """

    def __init__(self):
        self.records = []

    def _timestamp(self):
        return datetime.utcnow().isoformat() + "Z"

    def _judge(self, severity):
        levels = {
            "low": "observed",
            "medium": "recorded",
            "high": "flagged",
            "critical": "condemned"
        }
        return levels.get(severity, "unclassified")

    def add_entry(self, entity_name, event, severity="unknown"):
        entry = {
            "id": len(self.records) + 1,
            "entity": entity_name,
            "event": event,
            "severity": severity,
            "status": self._judge(severity),
            "timestamp": self._timestamp()
        }
        self.records.append(entry)
        return entry

    # =========================
    # Fictional BOOL TRANSFER LOGGER
    # =========================
    def log_bool_transfer(self, actor, target, allowed=True):
        """
        Simulated transfer event inside fictional system.
        No real systems or users are affected.
        """

        event = f"bool_transfer from {actor} -> {target}"

        if allowed:
            severity = "low"
            status_note = "transfer accepted"
        else:
            severity = "high"
            status_note = "transfer denied"

        return self.add_entry(
            entity_name=actor,
            event=f"{event} ({status_note})",
            severity=severity
        )

    def search(self, keyword):
        return [
            r for r in self.records
            if keyword.lower() in r["entity"].lower()
            or keyword.lower() in r["event"].lower()
        ]

    def get_all(self):
        return self.records

    def summary(self):
        return {
            "total_entries": len(self.records),
            "last_update": self.records[-1]["timestamp"] if self.records else None
        }


# =========================
# EXAMPLE SIMULATION RUN
# =========================
if __name__ == "__main__":
    hell = HellFile()

    hell.log_bool_transfer("Node_A", "Node_B", allowed=True)
    hell.log_bool_transfer("Node_X", "Node_Y", allowed=False)

    hell.add_entry("SystemCore", "manual override detected", "critical")

    print("=== HELL FILE LOGS ===")
    for record in hell.get_all():
        print(record)

    print("\n=== SUMMARY ===")
    print(hell.summary())