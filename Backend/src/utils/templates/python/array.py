from typing import *
import sys, json, math, collections, heapq, bisect, itertools, functools, traceback

# ###USERCODE###

def __format(result):
    if result is None:
        return "null"
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, list):
        def _fmt(x):
            if x is None: return "null"
            if isinstance(x, bool): return "true" if x else "false"
            return json.dumps(x) if isinstance(x, (list, dict)) else str(x)
        return "[" + ",".join(_fmt(x) for x in result) + "]"
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
        lines_tb = traceback.format_exc().strip().splitlines()
        user_tb = []
        in_user = False
        for l in lines_tb:
            if '###USERCODE###' in l or 'if __name__' in l:
                in_user = False
            if in_user or ('File "<string>"' in l and 'line' in l):
                user_tb.append(l)
                in_user = True
        sys.stderr.write('\n'.join(user_tb) if user_tb else '\n'.join(lines_tb))
        sys.exit(1)
