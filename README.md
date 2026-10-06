# EuroScrape MCP server

Twenty data tools for AI agents: flight, hotel and electricity prices, second-hand marketplaces, company data and leads, EU and French open data. Each tool runs one of the [EuroScrape Actors](https://apify.com/euroscrape) on Apify and returns structured JSON.

Works with Claude Desktop, Claude Code, Cursor, VS Code and any MCP client.

- **Runs on your own Apify account.** You pay Apify per result, at the price shown on each Actor's page. No subscription, nothing goes through us.
- **A spending cap on every call** (0.50 USD by default), so an agent cannot start an expensive run by mistake.
- **Cautious defaults**: an agent that forgets a limit gets 10 to 50 rows, not thousands.

## Install

You need Node.js 18 or later and an Apify API token ([Apify Console → Settings → API & Integrations](https://console.apify.com/settings/integrations)). Apify's free plan includes 5 USD of usage per month.

Add this to your MCP client configuration (for Claude Desktop: `claude_desktop_config.json`):

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

Claude Code:

```bash
claude mcp add --env APIFY_TOKEN=YOUR_APIFY_TOKEN euroscrape -- npx -y github:EuroScrape/euroscrape-mcp
```

## Tools

| Tool | What it returns | Actor |
|---|---|---|
| `get_electricity_prices` | Day-ahead electricity prices for 40+ European bidding zones, with the cheapest window of each day | [eu-electricity-prices](https://apify.com/euroscrape/eu-electricity-prices) |
| `search_flights` | Google Flights prices for a route and dates, cheapest day to fly, typical price range | [google-flights-prices](https://apify.com/euroscrape/google-flights-prices) |
| `find_ryanair_fares` | Ryanair fare calendar of a route, or every destination under a price cap from an airport | [ryanair-low-fares](https://apify.com/euroscrape/ryanair-low-fares) |
| `search_hotels` | Google Hotels prices, optionally on every booking site | [google-hotels-prices](https://apify.com/euroscrape/google-hotels-prices) |
| `search_second_hand_europe` | One search on the top second-hand marketplace of 18 countries, prices in euros, median per country | [eu-marketplace-deals](https://apify.com/euroscrape/eu-marketplace-deals) |
| `search_vinted` | Vinted listings in up to 26 countries, prices with buyer fees | [vinted-scraper](https://apify.com/euroscrape/vinted-scraper) |
| `search_kleinanzeigen` | Kleinanzeigen ads with a deal score against the market price | [kleinanzeigen-scraper](https://apify.com/euroscrape/kleinanzeigen-scraper) |
| `find_new_companies_without_website` | Newly registered companies (UK, France, five US states) with no website yet | [no-website-leads](https://apify.com/euroscrape/no-website-leads) |
| `search_uk_companies` | Companies House data by SIC code, town or incorporation date | [uk-companies](https://apify.com/euroscrape/uk-companies) |
| `search_french_companies` | SIRENE data by activity, department and size | [france-companies](https://apify.com/euroscrape/france-companies) |
| `validate_eu_vat_numbers` | VIES check of EU VAT numbers, with an official consultation number | [vat-validator](https://apify.com/euroscrape/vat-validator) |
| `get_company_behind_website` | The legal entity behind a European website, from its legal notice | [company-identity](https://apify.com/euroscrape/company-identity) |
| `detect_website_tech_stack` | Technologies used by a website (280+), with sales signals | [website-intelligence](https://apify.com/euroscrape/website-intelligence) |
| `search_eu_public_tenders` | Open tenders and contract awards in Europe and France | [eu-public-tenders](https://apify.com/euroscrape/eu-public-tenders) |
| `get_france_property_sales` | Real property sales in France (DVF), price per m2, energy class | [france-property-prices](https://apify.com/euroscrape/france-property-prices) |
| `get_france_energy_ratings` | Energy performance certificates of French homes (DPE) | [france-energy-ratings](https://apify.com/euroscrape/france-energy-ratings) |
| `get_france_building_permits` | Building permits in France (Sitadel), with the applicant company | [france-building-permits](https://apify.com/euroscrape/france-building-permits) |
| `get_france_fuel_prices` | Live fuel prices of the stations around a French city | [france-fuel-prices](https://apify.com/euroscrape/france-fuel-prices) |
| `get_app_reviews` | App Store and Google Play reviews by country | [app-reviews](https://apify.com/euroscrape/app-reviews) |
| `search_trusted_shops` | Online shops listed on Trusted Shops, or the reviews of a shop | [trusted-shops-scraper](https://apify.com/euroscrape/trusted-shops-scraper) |
| `get_run_results` | The results of a call that was still running when it returned (free) | |

Every tool description states its price. The full list of parameters is in [`tools.json`](tools.json).

## What a call does

1. Starts the Actor on your Apify account with your arguments and the spending cap.
2. Waits for the run to finish (up to four minutes; after that, `get_run_results` picks it up).
3. Returns the first rows as JSON, summary rows first, with the total count and a link to the full dataset in Apify Console.

## Settings

Optional environment variables:

| Variable | Default | Meaning |
|---|---|---|
| `EUROSCRAPE_MAX_USD_PER_CALL` | `0.5` | Spending cap of one call, in USD (Apify stops the run when it is reached) |
| `EUROSCRAPE_MAX_ITEMS` | `50` | Rows returned to the agent per call (the full result stays in your dataset) |
| `EUROSCRAPE_MAX_CHARS` | `40000` | Size limit of one answer, to protect the agent's context |
| `EUROSCRAPE_TIMEOUT_SECONDS` | `240` | How long a call waits for the run |

## Prefer a hosted server?

Apify hosts an MCP server that can load the same Actors, with OAuth and no local install:

```
https://mcp.apify.com?tools=euroscrape/eu-electricity-prices,euroscrape/google-flights-prices
```

This repository is the local alternative, with short tool names, cautious defaults and a spending cap.

## Development

```bash
npm install
npm test                                   # lists the tools and checks their schemas, no Apify call
APIFY_TOKEN=... node test/check.mjs --live # also runs one real, cheap call
```

Input examples, sample outputs and write-ups: [euroscrape.github.io/apify-actors](https://euroscrape.github.io/apify-actors/).

MIT license.
