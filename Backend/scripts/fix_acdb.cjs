const { Client } = require('pg');
const connectionString = 'postgresql://postgres.ughckpfggabtjlusvpxo:7325867407Bisu%40@aws-1-ap-south-1.pooler.supabase.com:6543/postgres';

async function run() {
    const client = new Client({ connectionString });
    await client.connect();

    const res = await client.query("SELECT id FROM \"problems\" WHERE title ILIKE '%Word Search%' LIMIT 1");
    if (res.rows.length === 0) return;
    const problemId = res.rows[0].id;

    const tcRes = await client.query('SELECT id, input, expected FROM "test_cases" WHERE "problemId" = $1', [problemId]);

    for (const tc of tcRes.rows) {
        if (tc.input.includes('"word": "ACDB"')) {
            console.log(`Fixing ACDB Test Case ${tc.id} to true`);
            await client.query('UPDATE "test_cases" SET expected = $1 WHERE id = $2', ["true", tc.id]);
        }
    }

    await client.end();
    console.log("Done.");
}

run().catch(console.error);
