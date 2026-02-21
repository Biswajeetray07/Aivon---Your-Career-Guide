// ###USERCODE###

class TreeNode {
    constructor(val = 0, left = null, right = null) {
        this.val = val; this.left = left; this.right = right;
    }
}

function __buildTree(vals) {
    if (!vals || vals.length === 0 || vals[0] === null) return null;
    const root = new TreeNode(vals[0]);
    const queue = [root];
    let i = 1;
    while (queue.length && i < vals.length) {
        const node = queue.shift();
        if (i < vals.length && vals[i] !== null) {
            node.left = new TreeNode(vals[i]);
            queue.push(node.left);
        }
        i++;
        if (i < vals.length && vals[i] !== null) {
            node.right = new TreeNode(vals[i]);
            queue.push(node.right);
        }
        i++;
    }
    return root;
}

function __serializeTree(root) {
    if (!root) return 'null';
    const result = [];
    const queue = [root];
    while (queue.length) {
        const node = queue.shift();
        if (node) {
            result.push(String(node.val));
            queue.push(node.left);
            queue.push(node.right);
        } else {
            result.push('null');
        }
    }
    while (result.length && result[result.length - 1] === 'null') result.pop();
    return '[' + result.join(',') + ']';
}

function __format(result) {
    if (result === null || result === undefined) return 'null';
    if (typeof result === 'boolean') return result ? 'true' : 'false';
    if (result instanceof TreeNode) return __serializeTree(result);
    if (Array.isArray(result)) return JSON.stringify(result);
    return String(result);
}

(function __main() {
    const lines = require('fs').readFileSync(0, 'utf-8').trim().split('\n').filter(Boolean);
    const args = lines.map(line => {
        try {
            const val = JSON.parse(line);
            // Convert arrays to TreeNode
            if (Array.isArray(val)) return __buildTree(val);
            return val;
        } catch (e) { return line; }
    });
    try {
        const obj = new Solution();
        const result = obj['###ENTRYPOINT###'](...args);
        process.stdout.write(__format(result) + '\n');
    } catch (e) {
        process.stderr.write((e.stack || String(e)) + '\n');
        process.exit(1);
    }
})();
