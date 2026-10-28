"""One real request through the application's cloud provider; no curl or mock reply.

Load backend/.env.local using the same shell convention as the FastAPI server.
Only message.content is printed on success. Never print headers or raw exceptions.
"""
import argparse
import sys
from pathlib import Path
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from synapsehub.ollama_cloud import CloudError, cloud_chat


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument('--prompt', default='In one short sentence, explain how linking research notes to tasks helps a student.')
    args = parser.parse_args()
    try:
        reply = cloud_chat([{'role': 'user', 'content': args.prompt}])
    except CloudError as exc:
        print(str(exc), file=sys.stderr)
        return 1
    except Exception:
        print('Ollama Cloud request failed unexpectedly. No reply was accepted; credentials were not logged.', file=sys.stderr)
        return 1
    print(reply)
    return 0


if __name__ == '__main__':
    raise SystemExit(main())
