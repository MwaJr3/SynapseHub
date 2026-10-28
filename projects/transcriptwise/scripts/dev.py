"""Run the real API and Vite together; Ctrl+C shuts down both process groups."""

import argparse
import concurrent.futures
import os
import shutil
import signal
import subprocess
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]


def stop(process):
    if process.poll() is not None:
        return
    if os.name == "posix":
        os.killpg(process.pid, signal.SIGTERM)
    else:
        process.terminate()
    try:
        process.wait(timeout=8)
    except subprocess.TimeoutExpired:
        if os.name == "posix":
            os.killpg(process.pid, signal.SIGKILL)
        else:
            process.kill()


def main():
    def terminate(signum, frame):
        raise KeyboardInterrupt

    signal.signal(signal.SIGTERM, terminate)
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--api-port", type=int, default=8000)
    parser.add_argument("--web-port", type=int, default=5308)
    parser.add_argument(
        "--reload", action="store_true", help="Reload the API when Python files change"
    )
    args = parser.parse_args()
    sys.path.insert(0, str(ROOT / "backend"))
    from app.config import get_settings

    if get_settings().app_env == "production":
        raise SystemExit(
            "The development runner refuses APP_ENV=production. Use the deployment instructions."
        )
    node = shutil.which("node")
    vite = ROOT / "frontend/node_modules/vite/bin/vite.js"
    if not node or not vite.exists():
        raise SystemExit("Install Node.js and run npm ci from frontend/ first.")
    subprocess.run(
        [sys.executable, "-m", "alembic", "upgrade", "head"],
        cwd=ROOT / "backend",
        check=True,
    )
    api = [
        sys.executable,
        "-m",
        "uvicorn",
        "app.main:app",
        "--host",
        "0.0.0.0",
        "--port",
        str(args.api_port),
        "--no-proxy-headers",
        "--no-access-log",
        "--loop",
        "asyncio",
        "--http",
        "h11",
    ]
    if args.reload:
        api.append("--reload")
    environment = {**os.environ, "VITE_API_TARGET": f"http://127.0.0.1:{args.api_port}"}
    processes = []
    try:
        processes.append(
            subprocess.Popen(
                api, cwd=ROOT / "backend", start_new_session=os.name == "posix"
            )
        )
        processes.append(
            subprocess.Popen(
                [node, str(vite), "--host", "0.0.0.0", "--port", str(args.web_port)],
                cwd=ROOT / "frontend",
                env=environment,
                start_new_session=os.name == "posix",
            )
        )
        print(
            f"TranscriptWise: http://localhost:{args.web_port} · API: http://localhost:{args.api_port}/docs · Ctrl+C stops both.",
            flush=True,
        )
        with concurrent.futures.ThreadPoolExecutor(max_workers=2) as executor:
            try:
                done, _ = concurrent.futures.wait(
                    [executor.submit(p.wait) for p in processes],
                    return_when=concurrent.futures.FIRST_COMPLETED,
                )
                if next(iter(done)).result():
                    raise SystemExit(
                        "A development service exited. Check the logs above (including occupied ports)."
                    )
            finally:
                # Stop before executor.__exit__ joins its wait threads (also on Ctrl+C).
                for process in processes:
                    stop(process)
    except KeyboardInterrupt:
        pass
    finally:
        for process in processes:
            stop(process)


if __name__ == "__main__":
    main()
