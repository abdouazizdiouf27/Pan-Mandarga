#!/usr/bin/env python3
"""Detached Next.js dev launcher for PAN Mandarga - survives parent shell exit."""
import os
from pathlib import Path
import sys
import time
import signal
import subprocess

PROJECT_DIR = str(Path(__file__).resolve().parents[1])
LOG_FILE = str(Path(PROJECT_DIR) / "dev.log")
PORT = 3000


def is_running():
    """Check if port 3000 is already serving."""
    try:
        import urllib.request
        urllib.request.urlopen(f"http://localhost:{PORT}/", timeout=2)
        return True
    except Exception:
        return False


def kill_existing():
    """Kill any existing next dev / next-server processes."""
    subprocess.run(["pkill", "-9", "-f", "next dev"], capture_output=True)
    subprocess.run(["pkill", "-9", "-f", "next-server"], capture_output=True)
    time.sleep(2)


def launch():
    """Start next dev in a new session, fully detached."""
    log_fp = open(LOG_FILE, "wb", buffering=0)
    proc = subprocess.Popen(
        ["node", f"{PROJECT_DIR}/node_modules/.bin/next", "dev", "-p", str(PORT)],
        cwd=PROJECT_DIR,
        stdout=log_fp,
        stderr=subprocess.STDOUT,
        stdin=subprocess.DEVNULL,
        start_new_session=True,  # equivalent to setsid - detaches from controlling terminal
        env={**os.environ, "NODE_ENV": "development"},
    )
    return proc.pid


if __name__ == "__main__":
    action = sys.argv[1] if len(sys.argv) > 1 else "start"

    if action == "status":
        if is_running():
            print(f"OK: server is up on port {PORT}")
            sys.exit(0)
        else:
            print(f"DOWN: server is not responding on port {PORT}")
            sys.exit(1)

    if action == "stop":
        kill_existing()
        print("Stopped")
        sys.exit(0)

    if action == "start":
        if is_running():
            print(f"Already running on port {PORT}")
            sys.exit(0)
        kill_existing()
        pid = launch()
        print(f"Launched dev server, PID={pid}")
        # Wait up to 30s for server to be ready
        for i in range(30):
            time.sleep(1)
            if is_running():
                print(f"Server is ready after {i+1}s")
                break
        else:
            print("Server failed to start within 30s")
            sys.exit(1)
        # Detach: parent exits, child stays in its own session
        sys.exit(0)
