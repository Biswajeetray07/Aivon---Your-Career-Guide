/**
 * UAS JavaScript Helpers — LeetCode-Grade Node.js Adapters
 *
 * Mirrors the Python UAS helpers for language parity.
 * All helper classes, adapter functions, and normalizers are stored as
 * string constants that get injected into the generated JS harness.
 */

// ── Auto-imports (Node.js built-ins) ────────────────────────────────────────

export const JS_AUTO_IMPORTS = ``;  // Node.js doesn't need explicit imports for built-ins

// ── Helper Class Definitions ────────────────────────────────────────────────

export const JS_HELPERS: Record<string, string> = {
  ListNode: `
class ListNode {
  constructor(val = 0, next = null) {
    this.val = val;
    this.next = next;
  }
}
`,

  TreeNode: `
class TreeNode {
  constructor(val = 0, left = null, right = null) {
    this.val = val;
    this.left = left;
    this.right = right;
  }
}
`,

  NaryNode: `
class Node {
  constructor(val = 0, children = []) {
    this.val = val;
    this.children = children;
  }
}
`,
};

// ── Adapter Functions (INPUT: raw JSON → runtime object) ────────────────────

export const JS_ADAPTERS = `
function __uas_build_linked_list(arr) {
  if (!arr || !arr.length) return null;
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) {
    cur.next = new ListNode(v);
    cur = cur.next;
  }
  return dummy.next;
}

function __uas_build_doubly_linked_list(arr) {
  if (!arr || !arr.length) return null;
  const dummy = new ListNode(0);
  let cur = dummy;
  for (const v of arr) {
    const node = new ListNode(v);
    node.prev = cur;
    cur.next = node;
    cur = cur.next;
  }
  dummy.next.prev = null;
  return dummy.next;
}

function __uas_build_tree(vals) {
  if (!vals || !vals.length || vals[0] === null) return null;
  const root = new TreeNode(vals[0]);
  const q = [root];
  let i = 1;
  while (q.length && i < vals.length) {
    const node = q.shift();
    if (i < vals.length && vals[i] !== null) {
      node.left = new TreeNode(vals[i]);
      q.push(node.left);
    }
    i++;
    if (i < vals.length && vals[i] !== null) {
      node.right = new TreeNode(vals[i]);
      q.push(node.right);
    }
    i++;
  }
  return root;
}

function __uas_build_nary_tree(data) {
  if (!data || !data.length || data[0] === null) return null;
  const root = new Node(data[0]);
  const q = [root];
  let i = 2; // skip first null sentinel
  while (q.length && i < data.length) {
    const parent = q.shift();
    while (i < data.length && data[i] !== null) {
      const child = new Node(data[i]);
      parent.children.push(child);
      q.push(child);
      i++;
    }
    i++; // skip null sentinel
  }
  return root;
}

function __uas_build_graph_adj(adjList) {
  return adjList; // pass-through: adjacency list is already usable
}

function __uas_build_graph_edges(edges) {
  return edges; // pass-through: edge list is already usable
}

function __uas_build_graph_weighted(edges) {
  return edges; // pass-through
}
`;

// ── Normalizer Functions (OUTPUT: runtime object → JSON-serializable) ───────

export const JS_NORMALIZERS = `
function __uas_serialize_list(head) {
  const res = [];
  const seen = new Set();
  while (head) {
    if (seen.has(head)) { res.push("cycle"); break; }
    seen.add(head);
    res.push(head.val);
    head = head.next;
  }
  return res;
}

function __uas_serialize_tree(root) {
  if (!root) return null;
  const res = [];
  const q = [root];
  while (q.length) {
    const n = q.shift();
    if (n) {
      res.push(n.val);
      q.push(n.left);
      q.push(n.right);
    } else {
      res.push(null);
    }
  }
  while (res.length && res[res.length - 1] === null) res.pop();
  return res;
}

function __uas_serialize_nary_tree(root) {
  if (!root) return [];
  const res = [root.val, null];
  const q = [root];
  while (q.length) {
    const node = q.shift();
    for (const child of node.children) {
      res.push(child.val);
      q.push(child);
    }
    res.push(null);
  }
  while (res.length && res[res.length - 1] === null) res.pop();
  return res;
}

function __uas_format(v) {
  if (v instanceof ListNode) return JSON.stringify(__uas_serialize_list(v));
  if (v instanceof TreeNode) return JSON.stringify(__uas_serialize_tree(v));
  if (typeof Node !== 'undefined' && v instanceof Node) return JSON.stringify(__uas_serialize_nary_tree(v));
  if (v === undefined || v === null) return JSON.stringify(null);
  return JSON.stringify(v);
}
`;
