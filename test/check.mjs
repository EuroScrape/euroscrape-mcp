// Starts the server over stdio, lists its tools and checks their schemas.
//   node test/check.mjs            no Apify call, no cost
//   node test/check.mjs --live     also runs one real, cheap call (needs APIFY_TOKEN)
import assert from 'node:assert/strict';
import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';

const env = { ...process.env };
if (!process.argv.includes('--live')) delete env.APIFY_TOKEN;
const transport = new StdioClientTransport({ command: process.execPath, args: [new URL('../server.js', import.meta.url).pathname], env });
const client = new Client({ name: 'euroscrape-check', version: '0.0.0' });
await client.connect(transport);

const { tools } = await client.listTools();
assert.equal(tools.length, 21, 'twenty Actor tools and get_run_results');
for (const tool of tools) {
    assert.match(tool.name, /^[a-z_]+$/);
    assert.ok(tool.description.length > 40, `${tool.name} has a description`);
    assert.equal(tool.inputSchema.type, 'object');
    for (const [key, property] of Object.entries(tool.inputSchema.properties)) assert.ok(property.type && property.description, `${tool.name}.${key} is typed and described`);
}
console.log(`${tools.length} tools listed, schemas valid`);

// without a token, a call must fail with a clear message, not crash the server
if (!process.argv.includes('--live')) {
    const result = await client.callTool({ name: 'get_electricity_prices', arguments: { zones: ['FR'] } });
    assert.equal(result.isError, true);
    assert.match(result.content[0].text, /APIFY_TOKEN/);
    console.log('call without a token: clear error');
} else {
    const result = await client.callTool({ name: 'get_electricity_prices', arguments: { zones: ['FR'], windowHours: 3 } });
    assert.notEqual(result.isError, true, result.content[0].text);
    const out = JSON.parse(result.content[0].text);
    assert.equal(out.status, 'SUCCEEDED');
    assert.ok(out.items.length > 0);
    console.log(`live call: ${out.status}, ${out.itemsReturned} of ${out.itemsTotal} items, first type "${out.items[0].type}"`);
    console.log(JSON.stringify(out.items[0]).slice(0, 300));
}
await client.close();
