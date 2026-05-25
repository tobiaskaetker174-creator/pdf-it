# pdf-it-safe

Convert Claude/Codex research output into a designed PDF: cover page, table of contents, styled body, and page-numbered footer. This Tobias-local fork is hardened for safer local use.

## Security profile

- Raw HTML in markdown is disabled.
- JavaScript is disabled while Chrome renders the PDF.
- External browser requests are blocked during rendering.
- Remote Google Fonts were removed; only local/system fonts are used.
- PDFs can only be written inside `~/Documents/pdf-it/`.

## When to use this skill

Use this skill when the user says any of the following or close variations:

- "save this as PDF"
- "export as PDF"
- "make a PDF report from this"
- "turn this into a PDF"
- "generate a PDF"
- "/pdf"
- "create a report"
- "I want a PDF of this research"
- "PDF this"

## How to use

This skill requires the local `pdf-it-safe` MCP server. If it is not connected, use the pinned local checkout at `C:\Users\Tobias\projects\pdf-it-safe`.

### Basic usage

Call the `generate_pdf` tool with the content you want to convert:

```json
{
  "content": "<markdown content>",
  "title": "<document title>",
  "author": "<author name>"
}
```

The PDF will be saved to `~/Documents/pdf-it/` and the path returned. Custom `output_path` values must stay inside that directory.

### Parameters

| Parameter | Required | Description |
|-----------|----------|-------------|
| `content` | Yes | Markdown string to convert |
| `title` | No | Shown on cover page and footer |
| `author` | No | Shown on cover page |
| `output_path` | No | Absolute `.pdf` path inside `~/Documents/pdf-it/` |
| `template` | No | `research-report` (default) or `plain` |

### Templates

- **research-report**: Cover page with title/author/date, auto-generated table of contents from H1/H2 headings, styled body, page-numbered footer. Best for research, summaries, and reports.
- **plain**: No cover, no TOC. Clean, dense body. Best for notes and short documents.

## Behavior

1. Collect the content to convert. This may be the current conversation, a file the user has provided, or content they paste.
2. Ask for a title if not obvious from context.
3. Call `generate_pdf` with the content and any available metadata.
4. Return the output path to the user.
5. Do not ask for author unless the user has mentioned their name earlier in the conversation.

## Setup

### Local install

```powershell
cd C:\Users\Tobias\projects\pdf-it-safe
npm ci
npm run build
```

### Add to Claude Code config

```json
{
  "mcpServers": {
    "pdf-it-safe": {
      "command": "cmd.exe",
      "args": ["/c", "C:\\Users\\Tobias\\projects\\pdf-it-safe\\scripts\\run-pdf-it-safe.cmd"]
    }
  }
}
```

### Requirements

- Node.js 18+
- Google Chrome installed

### Custom Chrome path

If Chrome is in a non-standard location:

```json
{
  "mcpServers": {
    "pdf-it-safe": {
      "command": "cmd.exe",
      "args": ["/c", "C:\\Users\\Tobias\\projects\\pdf-it-safe\\scripts\\run-pdf-it-safe.cmd"],
      "env": {
        "CHROME_PATH": "/path/to/chrome"
      }
    }
  }
}
```
