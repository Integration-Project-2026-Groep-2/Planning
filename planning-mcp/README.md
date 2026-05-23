# planning-mcp

Read-only [MCP](https://modelcontextprotocol.io) server that exposes the **Planning** team's REST
API as MCP tools over Streamable HTTP, so the master agent (`mcp-master` / "Jarvis") can read
sessions, locations and speakers.

It reads Planning **read-only** over its HTTP API (`GET /api/...`) — never the database directly —
and is **bundled into the Planning app image**, running as a second process in the Planning
container. It does not modify Planning's application code.

## Tools

All read-only (`readOnlyHint: true`):

| Tool | Args | Planning endpoint |
|---|---|---|
| `list_sessions` | – | `GET /api/sessions` |
| `get_session` | `id` | `GET /api/sessions/:id` |
| `get_session_speakers` | `id` | `GET /api/sessions/:id/speakers` |
| `get_session_logs` | `id` | `GET /api/sessions/:id/logs` |
| `list_locations` | – | `GET /api/locations` |
| `get_location` | `id` | `GET /api/locations/:id` |
| `list_speakers` | – | `GET /api/speakers` |
| `get_speaker` | `id` | `GET /api/speakers/:id` |

Attendee/user/registration data is intentionally **not** exposed, and speaker contact details
(`email`, `phoneNumber`) are redacted from responses (GDPR).

## Configuration

| Env | Default | Purpose |
|---|---|---|
| `PLANNING_API_BASE_URL` | `http://localhost:3000` | Base URL of the Planning REST API. Bundled in the same container, so the default already points at the Planning app. |
| `PLANNING_MCP_PORT` | `5556` | Port this server listens on. MCP endpoint is `POST /mcp`. |

## Develop

```bash
npm install
npm run build
npm test
npm run dev      # tsx; runs against PLANNING_API_BASE_URL (default http://localhost:3000)
```

HTTP endpoints: `POST /mcp` (Streamable HTTP) and `GET /health`.

## Deployment (bundled)

This package is **not** a standalone image. The Planning `Dockerfile` builds it and runs it as a
second process next to the Planning app:

```dockerfile
RUN cd planning-mcp && npm ci && npm run build && npm prune --omit=dev
EXPOSE 3000 5556
CMD ["sh", "-c", "node planning-mcp/dist/index.js & exec npm start"]
```

In k8s, expose port `5556` on the Planning Service so Jarvis can reach the MCP endpoint.

## Connecting Jarvis

Add this entry to `mcp-master`'s `MCP_SERVERS` (the MCP rides the Planning service):

```
planning@http://planning:5556/mcp
```
