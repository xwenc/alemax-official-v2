import test from "node:test";
import assert from "node:assert/strict";
import {
  blocksToDocument,
  documentToBlocks,
  safeRichLink,
} from "../lib/rich-text.ts";
test("legacy content keeps headings, list boundaries, Spanish text and line breaks", () => {
  const blocks = [
    { tag: "h2", text: "Especificaciones técnicas" },
    { tag: "p", text: "ALEMAX E470a\n25 kg" },
    { tag: "li", text: "Uno" },
    { tag: "li", text: "Dos" },
    { tag: "h3", text: "Aplicaciones" },
  ];
  const doc = blocksToDocument(blocks);
  assert.equal(doc.content[2].type, "bulletList");
  assert.equal(doc.content[2].content.length, 2);
  assert.deepEqual(documentToBlocks(doc), blocks);
});
test("rich links reject executable, protocol-relative and obfuscated URL schemes", () => {
  for (const url of [
    "javascript:alert(1)",
    "data:text/html,test",
    "//evil.example",
    "https:\\evil.example",
    "java\nscript:alert(1)",
    "",
  ])
    assert.equal(safeRichLink(url), false, url);
  for (const url of [
    "https://example.com/docs",
    "http://localhost:3100/en",
    "mailto:info@alemaxglobal.com",
    "/en/products",
  ])
    assert.equal(safeRichLink(url), true, url);
});
test("plain fallback retains text through inline formatting and nested lists", () => {
  const doc = {
    type: "doc",
    content: [
      {
        type: "paragraph",
        content: [
          { type: "text", text: "Calcium ", marks: [{ type: "bold" }] },
          {
            type: "text",
            text: "Stearate",
            marks: [{ type: "link", attrs: { href: "/en/products" } }],
          },
        ],
      },
      {
        type: "orderedList",
        content: [
          {
            type: "listItem",
            content: [
              { type: "paragraph", content: [{ type: "text", text: "25 kg" }] },
              {
                type: "bulletList",
                content: [
                  {
                    type: "listItem",
                    content: [
                      {
                        type: "paragraph",
                        content: [{ type: "text", text: "E470a" }],
                      },
                    ],
                  },
                ],
              },
            ],
          },
        ],
      },
    ],
  };
  assert.deepEqual(documentToBlocks(doc), [
    { tag: "p", text: "Calcium Stearate" },
    { tag: "li", text: "25 kg" },
    { tag: "li", text: "E470a" },
  ]);
});
