# Installing the EuroScrape MCP server (instructions for AI agents)

This server runs locally over stdio with Node.js. It needs one secret: an Apify API token.

## Requirements

- Node.js 18 or later (`node --version`).
- An Apify API token. If the user does not have one, ask them to create a free account at https://apify.com and copy the token from Apify Console → Settings → API & Integrations (https://console.apify.com/settings/integrations). Never invent a token.

## Configuration

Add this entry to the MCP settings of the client, replacing the placeholder with the user's token:

```json
{
  "mcpServers": {
    "euroscrape": {
      "command": "npx",
      "args": ["-y", "github:EuroScrape/euroscrape-mcp"],
      "env": { "APIFY_TOKEN": "YOUR_APIFY_TOKEN" }
    }
  }
}
```

Nothing has to be cloned or built: `npx` fetches the server from GitHub on first start (this can take up to a minute).

Optional environment variables: `EUROSCRAPE_MAX_USD_PER_CALL` (spending cap of one call in USD, default `0.5`), `EUROSCRAPE_MAX_ITEMS` (rows returned per call, default `50`).

## Check that it works

1. The server should list 21 tools (`get_electricity_prices`, `search_flights`, ... , `get_run_results`). Listing tools does not need a valid token.
2. A cheap real call: `get_electricity_prices` with `{"zones": ["FR"]}`. It costs about $0.01 on the user's Apify account and returns today's hourly prices with a day summary.

## Troubleshooting

- `APIFY_TOKEN is not set`: the `env` block is missing or the token is empty.
- `401` from Apify: the token is wrong or was revoked; ask the user for a new one.
- A call returns `status: RUNNING` with a `runId`: the run took longer than four minutes; call `get_run_results` with that `runId`.
- Every tool runs on the user's Apify account and is paid per result at the price given in the tool description; the spending cap stops a run that would cost more.
