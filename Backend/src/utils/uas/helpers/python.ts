/**
 * UAS Python Helpers — Auto-injectable class definitions
 * 
 * Each helper string is injected verbatim before user code.
 * All helpers are private-prefixed to avoid collisions with user variables.
 */

import type { HelperType } from "../types";

// ── Auto-imports ───────────────────────────────────────────────────────────────

export const PYTHON_AUTO_IMPORTS = `from typing import *
import sys, json, math, collections, heapq, bisect, itertools, functools, traceback, random
from collections import defaultdict, deque, Counter, OrderedDict
from heapq import heappush, heappop, heapify
from functools import lru_cache, reduce
from itertools import accumulate, permutations, combinations
sys.setrecursionlimit(300000)
random.seed(0)
`;

// ── Helper Definitions ────────────────────────────────────────────────────────

export const PYTHON_HELPERS: Record<HelperType, string> = {
  ListNode: `
class ListNode:
    def __init__(self, val=0, next=None):
        self.val = val
        self.next = next
    def __repr__(self):
        return f"ListNode({self.val})"
`,

  DoublyListNode: `
class DoublyListNode:
    def __init__(self, val=0, prev=None, next=None):
        self.val = val
        self.prev = prev
        self.next = next
`,

  TreeNode: `
class TreeNode:
    def __init__(self, val=0, left=None, right=None):
        self.val = val
        self.left = left
        self.right = right
    def __repr__(self):
        return f"TreeNode({self.val})"
`,

  NaryNode: `
class Node:
    def __init__(self, val=None, children=None):
        self.val = val
        self.children = children or []
`,
};

// ── Input Adapters (Python functions) ─────────────────────────────────────────

export const PYTHON_ADAPTERS = `
def __uas_build_linked_list(arr):
    if arr is None: return None
    if not arr: return None
    dummy = ListNode(0)
    cur = dummy
    for v in arr:
        cur.next = ListNode(v)
        cur = cur.next
    return dummy.next

def __uas_build_doubly_linked_list(arr):
    if not arr: return None
    head = DoublyListNode(arr[0])
    cur = head
    for v in arr[1:]:
        node = DoublyListNode(v, prev=cur)
        cur.next = node
        cur = node
    return head

def __uas_build_tree(vals):
    if not vals or vals[0] is None: return None
    root = TreeNode(vals[0])
    q = deque([root])
    i = 1
    while q and i < len(vals):
        node = q.popleft()
        if i < len(vals) and vals[i] is not None:
            node.left = TreeNode(vals[i])
            q.append(node.left)
        i += 1
        if i < len(vals) and vals[i] is not None:
            node.right = TreeNode(vals[i])
            q.append(node.right)
        i += 1
    return root

def __uas_build_nary_tree(vals):
    if not vals or vals[0] is None: return None
    root = Node(vals[0])
    q = deque([root])
    i = 1
    while q and i < len(vals):
        node = q.popleft()
        while i < len(vals) and vals[i] is not None:
            child = Node(vals[i])
            node.children.append(child)
            q.append(child)
            i += 1
        i += 1  # skip null separator
    return root

def __uas_build_graph_adj(data):
    return [list(neighbors) for neighbors in data]

def __uas_build_graph_edges(data):
    return [[int(x) for x in edge] for edge in data]

def __uas_build_graph_weighted(data):
    return [[int(x) for x in edge] for edge in data]
`;

// ── Output Normalizers (Python functions) ─────────────────────────────────────

export const PYTHON_NORMALIZERS = `
def __uas_serialize_list(head):
    result, seen = [], set()
    while head:
        if id(head) in seen:
            result.append("cycle")
            break
        seen.add(id(head))
        result.append(head.val)
        head = head.next
    return result

def __uas_serialize_tree(root):
    if not root: return []
    result = []
    q = deque([root])
    while q:
        node = q.popleft()
        if node:
            result.append(node.val)
            q.append(node.left)
            q.append(node.right)
        else:
            result.append(None)
    while result and result[-1] is None:
        result.pop()
    return result

def __uas_serialize_nary_tree(root):
    if not root: return []
    result = []
    q = deque([root])
    while q:
        node = q.popleft()
        result.append(node.val)
        result.append(None)  # null separator
        for ch in node.children:
            q.append(ch)
    if result and result[-1] is None:
        result.pop()
    return result

def __uas_format(result, output_type):
    if result is None: return "null"
    if output_type == "linked_list":
        arr = __uas_serialize_list(result)
        return json.dumps(arr)
    if output_type == "binary_tree" or output_type == "bst":
        arr = __uas_serialize_tree(result)
        return json.dumps(arr)
    if output_type == "nary_tree":
        arr = __uas_serialize_nary_tree(result)
        return json.dumps(arr)
    if isinstance(result, bool):
        return "true" if result else "false"
    if isinstance(result, float):
        return f"{result:.5f}"
    if isinstance(result, (list, dict)):
        return json.dumps(result)
    return str(result)
`;
