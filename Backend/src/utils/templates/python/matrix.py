from typing import *
import sys, json, traceback

# ###USERCODE###

def __format(result):
    if result is None:
        return "null"
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, list):
        return json.dumps(result)
    if isinstance(result, float):
        return f"{result:.5f}"
    return str(result)

if __name__ == '__main__':
    raw = sys.stdin.read().strip()
    lines = [l.strip() for l in raw.splitlines() if l.strip()]
    args = []
    for line in lines:
        try:
            val = json.loads(line)
        except Exception:
            val = line
        args.append(val)
    try:
        obj = Solution()
        # Entry point is replaced at runtime by code-runner.ts
        result = getattr(obj, '###ENTRYPOINT###')(*args)
        print(__format(result))
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)
