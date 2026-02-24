from typing import *
import sys, json, traceback

# ###USERCODE###

class Node:
    def __init__(self, val = 0, neighbors = None):
        self.val = val
        self.neighbors = neighbors if neighbors is not None else []

def __build_graph(adjList):
    if not adjList:
        return None
    
    nodes = {i: Node(i) for i in range(1, len(adjList) + 1)}
    
    for i, neighbors in enumerate(adjList):
        nodes[i+1].neighbors = [nodes[n] for n in neighbors]
        
    return nodes[1] if nodes else None

def __serialize_graph(node):
    if not node:
        return "[]"
    
    visited = set()
    queue = [node]
    visited.add(node.val)
    
    result_dict = {}
    
    while queue:
        curr = queue.pop(0)
        result_dict[curr.val] = [n.val for n in curr.neighbors]
        
        for n in curr.neighbors:
            if n.val not in visited:
                visited.add(n.val)
                queue.append(n)
                
    # Reconstruct the adjList form
    max_val = max(result_dict.keys()) if result_dict else 0
    res = []
    for i in range(1, max_val + 1):
        res.append(result_dict.get(i, []))
        
    return json.dumps(res)

def __format(result):
    if result is None:
        return "null"
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, Node):
        return __serialize_graph(result)
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

    # For graph, if an arg is an array of arrays, we could try to build a graph.
    # However, many graph problems take pure arrays (like edges).
    # We will ONLY build a Node graph if the problem type explicitly triggers it.
    final_args = []
    for arg in args:
        if isinstance(arg, list) and all(isinstance(x, list) for x in arg):
            final_args.append(__build_graph(arg))
        else:
            final_args.append(arg)

    try:
        print("###AIVON_RES###") # Print separator explicitly
        obj = Solution()
        # Entry point is replaced at runtime by code-runner.ts
        result = getattr(obj, '###ENTRYPOINT###')(*final_args)
        print(__format(result))
    except Exception:
        sys.stderr.write(traceback.format_exc())
        sys.exit(1)
