#!/usr/bin/env node
// EuroScrape MCP server: exposes the EuroScrape Actors (Apify Store) as tools for AI agents.
// Each call runs the Actor on the user's own Apify account (APIFY_TOKEN), with a spending cap per call.
import { readFileSync } from 'node:fs';
import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';

const read = (file) => JSON.parse(readFileSync(new URL(file, import.meta.url), 'utf8'));
const TOOLS = read('./tools.json');
const VERSION = read('./package.json').version;

const API = 'https://api.apify.com/v2';
const number = (name, fallback) => (Number.isFinite(Number(process.env[name])) && process.env[name] !== '' && process.env[name] !== undefined ? Number(process.env[name]) : fallback);
const MAX_USD = number('EUROSCRAPE_MAX_USD_PER_CALL', 0.5);
const MAX_ITEMS = number('EUROSCRAPE_MAX_ITEMS', 50);
const MAX_CHARS = number('EUROSCRAPE_MAX_CHARS', 40000);
const TIMEOUT_S = number('EUROSCRAPE_TIMEOUT_SECONDS', 240);
const FINAL = ['SUCCEEDED', 'FAILED', 'ABORTED', 'TIMED-OUT'];

const RESULTS_TOOL = {
    name: 'get_run_results',
    description: 'Fetches the results of a previous call that was still running when it returned (use the runId it gave you). Free: no new run is started.',
    inputSchema: { type: 'object', properties: { runId: { type: 'string', description: 'The runId returned by a previous tool call.' } }, required: ['runId'], additionalProperties: false },
};

async function api(method, path, body) {
    const token = process.env.APIFY_TOKEN;
    if (!token) throw new Error('APIFY_TOKEN is not set. Create a token in Apify Console > Settings > API & Integrations and pass it to this server as the APIFY_TOKEN environment variable.');
    const response = await fetch(API + path, {
        method,
        headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
        body: body === undefined ? undefined : JSON.stringify(body),
    });
    const text = await response.text();
    let json;
    try { json = JSON.parse(text); } catch { json = null; }
    if (!response.ok) throw new Error(`Apify API ${response.status}: ${json?.error?.message ?? text.slice(0, 300)}`);
    return { json, total: Number(response.headers.get('x-apify-pagination-total')) };
}

// Keeps only the fields the tool declares, drops empty values, then fills in the cautious defaults.
function buildInput(tool, args) {
    const input = { ...tool.defaults };
    for (const [key, value] of Object.entries(args ?? {})) {
        if (!(key in tool.inputSchema.properties)) continue;
        if (value === null || value === undefined || value === '' || (Array.isArray(value) && value.length === 0)) continue;
        input[key] = value;
    }
    return input;
}

async function waitForRun(run) {
    const deadline = Date.now() + TIMEOUT_S * 1000;
    while (!FINAL.includes(run.status) && Date.now() < deadline) {
        run = (await api('GET', `/actor-runs/${run.id}?waitForFinish=${Math.max(1, Math.min(60, Math.ceil((deadline - Date.now()) / 1000)))}`)).json.data;
    }
    return run;
}

async function results(run, actor) {
    const base = { actor, runId: run.id, status: run.status, fullResults: `https://console.apify.com/storage/datasets/${run.defaultDatasetId}` };
    if (!FINAL.includes(run.status)) return { ...base, note: 'The run is still going. Call get_run_results with this runId in a moment.' };
    const { json, total } = await api('GET', `/datasets/${run.defaultDatasetId}/items?clean=true&limit=${MAX_ITEMS}`);
    let items = Array.isArray(json) ? json : [];
    // summary rows first: they are what an agent usually needs, and they survive truncation
    items = [...items.filter((i) => /summary/i.test(i?.type ?? '')), ...items.filter((i) => !/summary/i.test(i?.type ?? ''))];
    const out = { ...base, itemsTotal: Math.max(Number.isFinite(total) ? total : 0, items.length), itemsReturned: items.length, items };
    if (run.status !== 'SUCCEEDED') out.note = `The run ended with status ${run.status}; partial results may be listed. Log: https://console.apify.com/actors/runs/${run.id}`;
    while (JSON.stringify(out).length > MAX_CHARS && out.items.length > 1) out.items.pop();
    out.itemsReturned = out.items.length;
    if (out.itemsReturned < out.itemsTotal) out.note = `${out.note ? `${out.note} ` : ''}Showing ${out.itemsReturned} of ${out.itemsTotal} items; the rest is at fullResults.`;
    return out;
}

async function callTool(name, args) {
    if (name === RESULTS_TOOL.name) {
        const run = (await api('GET', `/actor-runs/${encodeURIComponent(String(args?.runId ?? ''))}`)).json.data;
        return results(run, run.actId);
    }
    const tool = TOOLS.find((t) => t.name === name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    const input = buildInput(tool, args);
    const actorId = tool.actor.replace('/', '~');
    const started = (await api('POST', `/acts/${actorId}/runs?waitForFinish=60&maxTotalChargeUsd=${MAX_USD}`, input)).json.data;
    return results(await waitForRun(started), tool.actor);
}

const server = new Server({ name: 'euroscrape', version: VERSION }, { capabilities: { tools: {} } });

server.setRequestHandler(ListToolsRequestSchema, async () => ({
    tools: [...TOOLS.map((t) => ({
        name: t.name,
        title: t.title,
        description: t.description,
        inputSchema: t.inputSchema,
        annotations: { title: t.title, readOnlyHint: true, openWorldHint: true },
    })), { ...RESULTS_TOOL, annotations: { readOnlyHint: true } }],
}));

server.setRequestHandler(CallToolRequestSchema, async (request) => {
    try {
        const out = await callTool(request.params.name, request.params.arguments);
        return { content: [{ type: 'text', text: JSON.stringify(out, null, 1) }] };
    } catch (error) {
        return { content: [{ type: 'text', text: String(error?.message ?? error) }], isError: true };
    }
});

await server.connect(new StdioServerTransport());
