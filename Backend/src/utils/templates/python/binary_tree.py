from typing import *
import sys, json, collections, traceback

# ###USERCODE###

class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right

def __build_tree(vals):
    if not vals or vals[0] is None:
        return None
    root = TreeNode(vals[0])
    queue = collections.deque([root])
    i = 1
    while queue and i < len(vals):
        node = queue.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            queue.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            queue.append(node.right)
        i += 1
    return root

def __serialize_tree(root):
    if not root:
        return "null"
    result = []
    queue = collections.deque([root])
    while queue:
        node = queue.popleft()
        if node:
            result.append(str(node.val))
            queue.append(node.left)
            queue.append(node.right)
        else:
            result.append("null")
    # Strip trailing nulls
    while result and result[-1] == "null":
        result.pop()
    return "[" + ",".join(result) + "]"

def __format(result):
    if result is None:
        return "null"
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, TreeNode):
        return __serialize_tree(result)
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
        # Convert list args that represent trees
        args.append(val)

    # Build TreeNode args where the value is a list
    final_args = []
    for arg in args:
        if isinstance(arg, list) and (len(arg) == 0 or arg[0] is None or isinstance(arg[0], (int, float, type(None)))):
            final_args.append(__build_tree(arg))
        else:
            final_args.append(arg)

    try:
        obj = Solution()
        # Entry point is replaced at runtime by code-runner.ts
        result = getattr(obj, '###ENTRYPOINT###')(*final_args)
        print(__format(result))
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)
