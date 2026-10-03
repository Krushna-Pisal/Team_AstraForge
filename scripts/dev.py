"""One-terminal development supervisor, invoked by run.cmd/run.sh."""
import argparse
import hashlib
import json
import os
from pathlib import Path
import shutil
import signal
import socket
import subprocess
import sys
import time
import threading
from urllib.request import urlopen

ROOT = Path(__file__).resolve().parents[1]


def run_checked(args, cwd=ROOT):
    subprocess.run(args, cwd=cwd, check=True)


def check_port(port):
    with socket.socket() as sock:
        try:
            sock.bind(("127.0.0.1", port))
        except OSError:
            raise RuntimeError(f"Port {port} is already in use. Stop that server or pass --backend-port / --frontend-port. Existing processes will not be stopped.")


def main():
    if sys.version_info < (3, 12):
        raise RuntimeError("The pinned dependencies require Python 3.12+ (tested with 3.13).")
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--skip-install", action="store_true")
    parser.add_argument("--check", action="store_true", help="Check dependencies without starting servers")
    parser.add_argument("--smoke", action="store_true", help="Start, verify HTTP readiness, stop both servers")
    parser.add_argument("--no-reload", action="store_true", help="Disable automatic backend reloads")
    parser.add_argument("--backend-port", type=int, default=8000)
    parser.add_argument("--frontend-port", type=int, default=5173)
    args = parser.parse_args()
    if not all(1024 <= port <= 65535 for port in (args.backend_port, args.frontend_port)) or args.backend_port == args.frontend_port:
        raise RuntimeError("Choose distinct ports between 1024 and 65535.")
    if not args.check:
        # Detect a user's existing servers before touching any installed dependencies.
        check_port(args.backend_port)
        check_port(args.frontend_port)
    npm = shutil.which("npm.cmd" if os.name == "nt" else "npm")
    node = shutil.which("node")
    if not npm or not node:
        raise RuntimeError("Node.js and npm are required. Install Node 22.12+ and reopen the terminal.")
    version = subprocess.check_output([node, "--version"], text=True).strip()
    major, minor, *_ = map(int, version.lstrip("v").split("."))
    if major < 20 or major == 20 and minor < 19 or major == 21 or major == 22 and minor < 12:
        raise RuntimeError("Vite requires Node 20.19+ or 22.12+ (Node 22 recommended).")
    stamp_dir = ROOT / ".runtime"
    stamp_dir.mkdir(exist_ok=True)
    requirements = ROOT / "backend" / "requirements.txt"
    lockfile = ROOT / "frontend" / "package-lock.json"
    stamp = stamp_dir / "dependencies.sha256"
    digest = hashlib.sha256(requirements.read_bytes() + lockfile.read_bytes() + sys.version.encode()).hexdigest()
    installed = stamp.exists() and stamp.read_text() == digest and (ROOT / "frontend/node_modules/vite/bin/vite.js").exists()
    if not args.skip_install and not installed:
        print("Installing project dependencies...", flush=True)
        run_checked([sys.executable, "-m", "pip", "install", "--quiet", "-r", str(requirements)])
        # On Windows npm ci unlinks native modules, which may be loaded by another
        # dev server. An in-place install honors the lockfile without clearing them.
        npm_action = "install" if (ROOT / "frontend/node_modules").exists() else "ci"
        run_checked([npm, npm_action], ROOT / "frontend")
        stamp.write_text(digest)
    run_checked([sys.executable, "-c", "import fastapi,uvicorn,pydantic,numpy,pandas,yfinance"])
    if not (ROOT / "frontend/node_modules/vite/bin/vite.js").exists():
        raise RuntimeError("Frontend dependencies are missing. Run without --skip-install.")
    if args.check:
        print(f"Ready: Python {sys.version.split()[0]}, Node {version}, backend dependencies and Vite installed.")
        return
    check_port(args.backend_port)
    check_port(args.frontend_port)
    env = os.environ.copy()
    env["BACKEND_URL"] = f"http://127.0.0.1:{args.backend_port}"
    env["PYTHONUNBUFFERED"] = "1"
    children = []
    def stop(*_):
        raise KeyboardInterrupt
    signal.signal(signal.SIGINT, stop)
    signal.signal(signal.SIGTERM, stop)
    creationflags = subprocess.CREATE_NEW_PROCESS_GROUP | subprocess.CREATE_NO_WINDOW if os.name == "nt" else 0
    try:
        reload_args = [] if args.no_reload else ["--reload", "--reload-dir", str(ROOT / "backend" / "app")]
        backend = subprocess.Popen([sys.executable, "-m", "uvicorn", "app.main:app", "--app-dir", "backend",
            "--host", "127.0.0.1", "--port", str(args.backend_port), *reload_args], cwd=ROOT, env=env, creationflags=creationflags,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        children.append(backend)
        frontend = subprocess.Popen([node, "node_modules/vite/bin/vite.js", "--host", "127.0.0.1",
            "--port", str(args.frontend_port), "--strictPort"], cwd=ROOT / "frontend", env=env, creationflags=creationflags,
            stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, encoding="utf-8", errors="replace")
        children.append(frontend)
        def stream_output(child, name):
            for line in child.stdout:
                try:
                    print(f"[{name}] {line.rstrip()}", flush=True)
                except (OSError, UnicodeEncodeError):
                    pass
        for child, name in ((backend, "API"), (frontend, "WEB")):
            threading.Thread(target=stream_output, args=(child, name), daemon=True).start()
        urls = [f"http://127.0.0.1:{args.backend_port}/health", f"http://127.0.0.1:{args.frontend_port}",
                f"http://127.0.0.1:{args.frontend_port}/api/market-data/catalog",
                f"http://127.0.0.1:{args.frontend_port}/api/market-data/search?kind=equity"]
        deadline = time.monotonic() + 45
        pending = set(urls)
        while pending and time.monotonic() < deadline:
            if any(p.poll() is not None for p in children):
                raise RuntimeError("A development server exited during startup. See its output above.")
            for url in urls:
                if url not in pending or (url != urls[0] and urls[0] in pending):
                    continue
                try:
                    with urlopen(url, timeout=1) as response:
                        if response.status == 200:
                            pending.remove(url)
                except (OSError, TimeoutError):
                    pass
            time.sleep(0.25)
        if pending:
            raise RuntimeError("Servers did not become ready within 45 seconds.")
        print(f"\nAstraForge is ready: http://localhost:{args.frontend_port}", flush=True)
        print(f"API docs: http://localhost:{args.backend_port}/docs\nPress Ctrl+C to stop both servers.", flush=True)
        if args.smoke:
            print("Smoke check passed: API, frontend and Vite API proxy are responding.", flush=True)
            return
        while True:
            for child in children:
                if child.poll() is not None:
                    raise RuntimeError(f"A server exited (code {child.returncode}); stopping its companion.")
            time.sleep(0.5)
    except KeyboardInterrupt:
        print("\nStopping AstraForge...", flush=True)
    finally:
        for child in reversed(children):
            if child.poll() is None:
                if os.name == "nt":
                    subprocess.run(["taskkill", "/PID", str(child.pid), "/T", "/F"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
                else:
                    child.terminate()
        for child in children:
            try:
                child.wait(timeout=8)
            except subprocess.TimeoutExpired:
                child.kill()
                child.wait()


if __name__ == "__main__":
    try:
        main()
    except (RuntimeError, subprocess.CalledProcessError, OSError) as exc:
        print(f"Startup failed: {exc}", file=sys.stderr)
        sys.exit(1)
