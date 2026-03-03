const { Client } = require('pg');

const connectionString = 'postgresql://postgres.ughckpfggabtjlusvpxo:7325867407Bisu%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString });
    await client.connect();

    console.log("Connected to DB.");

    const res = await client.query("SELECT id, title FROM \"problems\" WHERE title ILIKE '%Word Search%' LIMIT 1");
    if (res.rows.length === 0) {
        console.log("Problem 'Word Search' not found.");
        await client.end();
        return;
    }
    const problemId = res.rows[0].id;
    console.log(`Found Word Search, ID: ${problemId}`);

    const tcRes = await client.query('SELECT id, input, expected FROM "test_cases" WHERE "problemId" = $1', [problemId]);

    for (const tc of tcRes.rows) {
        if (tc.expected.includes("Error:") || tc.expected.includes("missing") || tc.expected.includes("false") || tc.expected.includes("true")) {

            let newExpected = "false";
            if (tc.input.includes('"word": "ABCB"')) {
                newExpected = "false";
            } else if (tc.input.includes('"word": "ABCCED"')) {
                newExpected = "true";
            } else if (tc.input.includes('"word": "SEE"')) {
                newExpected = "true";
            } else if (tc.input.includes('"word": "BDFH"')) {
                newExpected = "false";
            } else if (tc.input.includes('"word": "BD"')) {
                newExpected = "true";
            } else {
                // generic default fallback
                newExpected = "false";
            }

            if (tc.expected !== newExpected) {
                console.log(`Fixing test case ${tc.id}`);
                console.log(`Input: ${tc.input}`);
                console.log(`Old Expected: ${tc.expected} -> New: ${newExpected}`);
                await client.query('UPDATE "test_cases" SET expected = $1 WHERE id = $2', [newExpected, tc.id]);
                console.log(`Updated.`);
            } else {
                console.log(`Test case ${tc.id} correctly expecting ${tc.expected}`);
            }
        }
    }

    await client.end();
    console.log("Done.");
}

run().catch(console.error);
