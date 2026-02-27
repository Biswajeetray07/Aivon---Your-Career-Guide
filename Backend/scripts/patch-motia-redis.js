/**
 * 🔧 PATCH: Add TLS support to Motia's Redis connection
 * 
 * Motia's internal Redis client does NOT support TLS.
 * Upstash (and most cloud Redis providers) REQUIRE TLS.
 * This patch adds `tls: true` to the socket config.
 * 
 * Runs automatically via `postinstall` in package.json.
 */
import { readFileSync, writeFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __dirname = dirname(fileURLToPath(import.meta.url));
const targetFile = join(__dirname, '..', 'node_modules', 'motia', 'dist', 'redis', 'connection.mjs');

try {
    let content = readFileSync(targetFile, 'utf8');

    if (content.includes('tls: true')) {
        console.log('✅ [Patch] Motia Redis TLS already patched.');
        process.exit(0);
    }

    // Add tls: true to the socket config when MOTIA_REDIS_HOST is set
    const original = `noDelay: true,`;
    const patched = `noDelay: true,\n\t\t\t\t\t\ttls: process.env.MOTIA_REDIS_HOST && process.env.MOTIA_REDIS_HOST !== "127.0.0.1",`;

    if (!content.includes(original)) {
        console.error('❌ [Patch] Could not find target string in connection.mjs. Motia may have been updated.');
        process.exit(0); // Don't fail the build
    }

    content = content.replace(original, patched);
    writeFileSync(targetFile, content, 'utf8');
    console.log('✅ [Patch] Motia Redis TLS support added successfully!');
} catch (err) {
    console.warn('⚠️ [Patch] Could not patch Motia Redis:', err.message);
    // Don't fail the build
}
