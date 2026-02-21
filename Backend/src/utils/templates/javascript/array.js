// ###USERCODE###

(function __main() {
    const lines = require('fs').readFileSync(0, 'utf-8').trim().split('\n').filter(Boolean);
    const args = lines.map(line => {
        try { return JSON.parse(line); } catch (e) { return line; }
    });
    function __format(result) {
        if (result === null || result === undefined) return 'null';
        if (typeof result === 'boolean') return result ? 'true' : 'false';
        if (typeof result === 'number') return String(result);
        if (Array.isArray(result)) return JSON.stringify(result);
        if (typeof result === 'object') return JSON.stringify(result);
        return String(result);
    }
    try {
        const obj = new Solution();
        const result = obj['###ENTRYPOINT###'](...args);
        process.stdout.write(__format(result) + '\n');
    } catch (e) {
        process.stderr.write((e.stack || String(e)) + '\n');
        process.exit(1);
    }
})();
