<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

## Shared Project Rules

Follow the root `../AGENTS.md` project contract in addition to this frontend
override. Claude reaches this file through `frontend/CLAUDE.md`; Codex should
treat the root file as the shared source of truth and this file as the local
Next.js warning.
