# Workspace

## Overview

pnpm workspace monorepo using TypeScript. Each package manages its own dependencies.

## Stack

- **Monorepo tool**: pnpm workspaces
- **Node.js version**: 24
- **Package manager**: pnpm
- **TypeScript version**: 5.9
- **API framework**: Express 5
- **Database**: PostgreSQL + Drizzle ORM
- **Validation**: Zod (`zod/v4`), `drizzle-zod`
- **API codegen**: Orval (from OpenAPI spec)
- **Build**: esbuild (CJS bundle)

## Key Commands

- `pnpm run typecheck` — full typecheck across all packages
- `pnpm run build` — typecheck + build all packages
- `pnpm --filter @workspace/api-spec run codegen` — regenerate API hooks and Zod schemas from OpenAPI spec
- `pnpm --filter @workspace/db run push` — push DB schema changes (dev only)
- `pnpm --filter @workspace/api-server run dev` — run API server locally

See the `pnpm-workspace` skill for workspace structure, TypeScript setup, and package details.

## Know Your Friend App

A real-time multiplayer party game at `/`.

### Architecture

- **Frontend**: React + Vite at `artifacts/know-your-friend/`
- **Backend**: Express + WebSocket at `artifacts/api-server/`
- **Game state**: In-memory (ephemeral party sessions)
- **Categories**: Persisted in PostgreSQL (`categories` table); cached in memory (`categories-store.ts`), refreshed on every mutation
- **Real-time**: WebSocket at `/ws?roomCode=CODE&playerToken=TOKEN`
- **Admin UI**: `/admin` — live add/edit/delete/reset of categories (no auth in v1)

### Game Flow

1. Host creates a room → gets a 4-char code
2. Friends join using the code
3. Game proceeds in turns — each turn one player:
   - Picks a category (e.g. "Ordentlichkeit")
   - Secretly rates themselves on a 0–100 slider (Messie ↔ Ordnungsqueen)
   - Other players guess where they rated themselves
4. Closer guesses = more points (max 100 per round)
5. After all rounds, final scoreboard shown

### Key Files

- `artifacts/api-server/src/lib/game-engine.ts` — all game logic and in-memory state
- `artifacts/api-server/src/lib/ws-handler.ts` — WebSocket event handling
- `artifacts/api-server/src/routes/rooms.ts` — REST endpoints
- `artifacts/know-your-friend/src/` — React frontend
- `lib/api-spec/openapi.yaml` — API contract (do not change `info.title`)

### WebSocket Events

Server → Client: `{ type: 'state', state: RoomState }` or `{ type: 'error', message: string }`

Client → Server:
- `{ type: 'start_game' }` — host only
- `{ type: 'select_category', categoryId: string }` — current player only
- `{ type: 'submit_self_rating', rating: number }` — current player only
- `{ type: 'submit_guess', guess: number }` — other players
- `{ type: 'next_turn' }` — any player (advances after round_results)
