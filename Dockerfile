# Runs the EuroScrape MCP server over stdio.
#   docker build -t euroscrape-mcp .
#   docker run -i --rm -e APIFY_TOKEN=YOUR_APIFY_TOKEN euroscrape-mcp
FROM node:22-alpine
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci --omit=dev
COPY server.js tools.json ./
LABEL io.modelcontextprotocol.server.name="io.github.EuroScrape/euroscrape-mcp"
ENTRYPOINT ["node", "server.js"]
