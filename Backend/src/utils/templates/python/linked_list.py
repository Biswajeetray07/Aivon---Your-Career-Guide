from typing import *
import sys, json, traceback

# ###USERCODE###

class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next

def __build_list(vals):
    if not vals:
        return None
    dummy = ListNode(0)
    cur = dummy
    for v in vals:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def __serialize_list(head):
    result = []
    seen = set()
    while head:
        if id(head) in seen:
            result.append("cycle")
            break
        seen.add(id(head))
        result.append(str(head.val))
        head = head.next
    return "[" + ",".join(result) + "]"

def __format(result):
    if result is None:
        return "null"
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, ListNode):
        return __serialize_list(result)
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
        # Convert list args that represent linked lists
        if isinstance(val, list) and all(isinstance(x, int) for x in val):
            args.append(__build_list(val))
        else:
            args.append(val)
    try:
        obj = Solution()
        # Entry point is replaced at runtime by code-runner.ts
        result = getattr(obj, '###ENTRYPOINT###')(*args)
        print(__format(result))
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)
