#!/usr/bin/env node
import { Client } from "@modelcontextprotocol/sdk/client/index.js";
import { StdioClientTransport } from "@modelcontextprotocol/sdk/client/stdio.js";
import { mkdirSync, mkdtempSync, statSync, readFileSync, rmSync, unlinkSync } from "node:fs";
import { homedir, tmpdir } from "node:os";
import path from "node:path";

const PASS = "\x1b[32m✓\x1b[0m";
const FAIL = "\x1b[31m✗\x1b[0m";
const INFO = "\x1b[36m·\x1b[0m";

let failures = 0;
function check(label, cond, detail) {
  if (cond) {
    console.log(`${PASS} ${label}`);
  } else {
    failures++;
    console.log(`${FAIL} ${label}${detail ? ` — ${detail}` : ""}`);
  }
}

const SAMPLE_MARKDOWN = `# Test Report

This is a generated test document used by the pdf-it integration test.

## Section A

Some prose with **bold** and *italic* text.

## Section B

\`\`\`js
const greet = (name) => \`Hello, \${name}!\`;
\`\`\`

A short list:

- Item one
- Item two
- Item three

## Section C

Final paragraph to give the renderer enough content to span more than
one page when rendered with the research-report template.
`;

const tmpDir = mkdtempSync(path.join(tmpdir(), "pdf-it-test-"));
const allowedOutputDir = path.join(homedir(), "Documents", "pdf-it");
mkdirSync(allowedOutputDir, { recursive: true });
const outputPath = path.join(allowedOutputDir, `pdf-it-safe-test-${Date.now()}.pdf`);
console.log(`${INFO} Output path: ${outputPath}`);

const transport = new StdioClientTransport({
  command: "node",
  args: ["dist/index.js"],
});

const client = new Client(
  { name: "pdf-it-integration-test", version: "1.0.0" },
  { capabilities: {} }
);

try {
  await client.connect(transport);
  console.log(`${PASS} Server connected`);

  const tools = await client.listTools();
  const toolNames = tools.tools.map((t) => t.name);
  check("tools/list contains generate_pdf", toolNames.includes("generate_pdf"));
  check("tools/list contains list_templates", toolNames.includes("list_templates"));

  const prompts = await client.listPrompts();
  const promptNames = prompts.prompts.map((p) => p.name);
  for (const name of ["research_report", "quick_note", "pdf_outline"]) {
    check(`prompts/list contains ${name}`, promptNames.includes(name));
  }

  const resources = await client.listResources();
  const resourceUris = resources.resources.map((r) => r.uri);
  check(
    "resources/list contains style-guide",
    resourceUris.includes("pdf-it://style-guide")
  );
  check(
    "resources/list contains markdown-cheatsheet",
    resourceUris.includes("pdf-it://markdown-cheatsheet")
  );

  console.log(`${INFO} Listing templates`);
  const tmplResult = await client.callTool({
    name: "list_templates",
    arguments: {},
  });
  check("list_templates did not error", !tmplResult.isError);
  const tmplText = tmplResult.content.map((c) => c.text).join("\n");
  check("list_templates mentions research-report", /research-report/.test(tmplText));
  check("list_templates mentions plain", /plain/.test(tmplText));

  console.log(`${INFO} Rejecting output outside ~/Documents/pdf-it`);
  const blockedPathResult = await client.callTool({
    name: "generate_pdf",
    arguments: {
      content: "# Blocked path test\n\nThis should not be written.",
      title: "blocked path test",
      template: "plain",
      output_path: path.join(tmpDir, "outside.pdf"),
    },
  });
  check("outside output_path is rejected", !!blockedPathResult.isError);
  const blockedPathText = blockedPathResult.content.map((c) => c.text ?? "").join("\n");
  check("outside output_path explains directory restriction", /stay inside/.test(blockedPathText));

  console.log(`${INFO} Rejecting non-PDF output extension`);
  const blockedExtensionResult = await client.callTool({
    name: "generate_pdf",
    arguments: {
      content: "# Blocked extension test\n\nThis should not be written.",
      title: "blocked extension test",
      template: "plain",
      output_path: path.join(allowedOutputDir, "blocked-extension.txt"),
    },
  });
  check("non-pdf output_path is rejected", !!blockedExtensionResult.isError);
  const blockedExtensionText = blockedExtensionResult.content.map((c) => c.text ?? "").join("\n");
  check("non-pdf output_path explains extension restriction", /end with \.pdf/.test(blockedExtensionText));

  console.log(`${INFO} Generating PDF (research-report template)`);
  const result = await client.callTool({
    name: "generate_pdf",
    arguments: {
      content: SAMPLE_MARKDOWN,
      title: "pdf-it integration test",
      author: "CI",
      template: "research-report",
      output_path: outputPath,
    },
  });

  const summaryText = result.content.find((c) => c.type === "text");
  if (result.isError) {
    console.log(`${INFO} generate_pdf error: ${summaryText?.text}`);
  }
  check("generate_pdf did not error", !result.isError);

  let stat;
  try {
    stat = statSync(outputPath);
  } catch (e) {
    check("PDF written to disk", false, e.message);
  }
  if (stat) {
    check("PDF written to disk", true);
    check("PDF is non-trivial size (> 5 KB)", stat.size > 5_000, `${stat.size} bytes`);

    const head = readFileSync(outputPath).subarray(0, 5).toString("ascii");
    check("file starts with %PDF- magic bytes", head.startsWith("%PDF-"), `header=${JSON.stringify(head)}`);
  }

  console.log(`${INFO} Rendering hostile markdown without executing/fetching`);
  const hostileOutputPath = path.join(allowedOutputDir, `pdf-it-safe-hostile-${Date.now()}.pdf`);
  const hostileResult = await client.callTool({
    name: "generate_pdf",
    arguments: {
      content: `# Hostile Markdown Test

<script>throw new Error("raw html should not execute")</script>

![remote image](https://example.com/blocked.png)
`,
      title: "hostile markdown test",
      template: "plain",
      output_path: hostileOutputPath,
    },
  });
  check("hostile markdown render did not error", !hostileResult.isError);
  try {
    const hostileStat = statSync(hostileOutputPath);
    check("hostile markdown PDF written", hostileStat.size > 5_000, `${hostileStat.size} bytes`);
  } catch (e) {
    check("hostile markdown PDF written", false, e.message);
  } finally {
    try {
      unlinkSync(hostileOutputPath);
    } catch {}
  }

  console.log(`${INFO} Closing client`);
  await client.close();
} catch (err) {
  console.log(`${FAIL} Unhandled error: ${err.message}`);
  failures++;
} finally {
  try {
    rmSync(tmpDir, { recursive: true, force: true });
  } catch {}
  try {
    unlinkSync(outputPath);
  } catch {}
}

if (failures > 0) {
  console.log(`\n${FAIL} ${failures} check(s) failed`);
  process.exit(1);
}
console.log(`\n${PASS} All checks passed`);
process.exit(0);
