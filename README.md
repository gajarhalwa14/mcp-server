# MCP Server

A Model Context Protocol (MCP) server that exposes:

- **Tools**: `read_file` (local file access) and `query_sqlite` (read-only SQLite queries)
- **Resources**: server configuration and SQLite schema introspection
- **Prompts**: reusable prompt templates for common analysis workflows

This project follows Anthropic's MCP specification and is designed to integrate cleanly with MCP hosts such as Claude Desktop.

## Documentation

- **Specification**: see `SPEC.md` for feature and tech-stack details.
- **Architecture**: see `ARCHITECTURE.md` for directory layout and design.
- **Implementation plan**: see `TODO.md` for a step-by-step implementation checklist.

## Quick start

```bash
npm install
npm run build
npm run dev
```

> Note: the server entrypoint (`src/server.ts`) and related modules are implemented in later steps as described in `TODO.md`.

