// ###USERCODE###

class ListNode {
    constructor(val = 0, next = null) {
        this.val = val; this.next = next;
    }
}

function __buildList(vals) {
    if (!vals || vals.length === 0) return null;
    const dummy = new ListNode(0);
    let cur = dummy;
    for (const v of vals) { cur.next = new ListNode(v); cur = cur.next; }
    return dummy.next;
}

function __serializeList(head) {
    const result = [];
    const seen = new Set();
    while (head) {
        if (seen.has(head)) { result.push('cycle'); break; }
        seen.add(head);
        result.push(String(head.val));
        head = head.next;
    }
    return '[' + result.join(',') + ']';
}

function __format(result) {
    if (result === null || result === undefined) return 'null';
    if (typeof result === 'boolean') return result ? 'true' : 'false';
    if (result instanceof ListNode) return __serializeList(result);
    if (Array.isArray(result)) return JSON.stringify(result);
    return String(result);
}

(function __main() {
    const lines = require('fs').readFileSync(0, 'utf-8').trim().split('\n').filter(Boolean);
    const args = lines.map(line => {
        try {
            const val = JSON.parse(line);
            if (Array.isArray(val) && val.every(x => typeof x === 'number')) return __buildList(val);
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
