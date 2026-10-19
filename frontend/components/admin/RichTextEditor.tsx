"use client";
import { useEffect, useRef, useState } from "react";
import { EditorContent, useEditor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Underline from "@tiptap/extension-underline";
import { safeRichLink, type RichTextDocument } from "@/lib/rich-text";

export default function RichTextEditor({
  value,
  onChange,
  disabled = false,
}: {
  value: RichTextDocument;
  onChange: (document: RichTextDocument) => void;
  disabled?: boolean;
}) {
  const change = useRef(onChange);
  change.current = onChange;
  const [linkOpen, setLinkOpen] = useState(false),
    [href, setHref] = useState(""),
    [error, setError] = useState("");
  const editor = useEditor({
    immediatelyRender: false,
    shouldRerenderOnTransaction: true,
    extensions: [
      StarterKit.configure({
        heading: { levels: [2, 3] },
        link: false,
        underline: false,
        code: false,
        codeBlock: false,
      }),
      Link.configure({
        openOnClick: false,
        autolink: false,
        isAllowedUri: (url) => safeRichLink(url),
      }),
      Underline,
    ],
    content: value,
    editable: !disabled,
    editorProps: {
      attributes: {
        role: "textbox",
        "aria-label": "Body content",
        "aria-multiline": "true",
        "data-placeholder": "Write your content here…",
        class: "admin-rich-content",
      },
    },
    onUpdate: ({ editor }) =>
      change.current(editor.getJSON() as RichTextDocument),
  });
  useEffect(() => {
    if (editor && JSON.stringify(editor.getJSON()) !== JSON.stringify(value))
      editor.commands.setContent(value, { emitUpdate: false });
  }, [editor, value]);
  useEffect(() => {
    editor?.setEditable(!disabled, false);
  }, [editor, disabled]);
  function applyLink() {
    const url = href.trim();
    if (url && !safeRichLink(url)) {
      setError("Use an https://, http://, mailto: or /local-path link.");
      return;
    }
    if (url)
      editor
        ?.chain()
        .focus()
        .extendMarkRange("link")
        .setLink({ href: url })
        .run();
    else editor?.chain().focus().extendMarkRange("link").unsetLink().run();
    setLinkOpen(false);
    setError("");
  }
  const actions = editor
    ? [
        {
          name: "Bold",
          label: <strong>B</strong>,
          active: editor.isActive("bold"),
          run: () => editor.chain().focus().toggleBold().run(),
        },
        {
          name: "Italic",
          label: <em>I</em>,
          active: editor.isActive("italic"),
          run: () => editor.chain().focus().toggleItalic().run(),
        },
        {
          name: "Underline",
          label: <u>U</u>,
          active: editor.isActive("underline"),
          run: () => editor.chain().focus().toggleUnderline().run(),
        },
        {
          name: "Strikethrough",
          label: <s>S</s>,
          active: editor.isActive("strike"),
          run: () => editor.chain().focus().toggleStrike().run(),
        },
        {
          name: "Bullet list",
          label: "• List",
          active: editor.isActive("bulletList"),
          run: () => editor.chain().focus().toggleBulletList().run(),
        },
        {
          name: "Numbered list",
          label: "1. List",
          active: editor.isActive("orderedList"),
          run: () => editor.chain().focus().toggleOrderedList().run(),
        },
        {
          name: "Block quote",
          label: "❝ Quote",
          active: editor.isActive("blockquote"),
          run: () => editor.chain().focus().toggleBlockquote().run(),
        },
      ]
    : [];
  return (
    <div className={`admin-rich-editor${disabled ? " disabled" : ""}`}>
      <div
        className="admin-rich-toolbar"
        role="toolbar"
        aria-label="Body formatting"
      >
        <select
          aria-label="Text style"
          disabled={!editor || disabled}
          value={
            editor?.isActive("heading", { level: 2 })
              ? "h2"
              : editor?.isActive("heading", { level: 3 })
                ? "h3"
                : "p"
          }
          onChange={(event) => {
            if (event.target.value === "p")
              editor?.chain().focus().setParagraph().run();
            else
              editor
                ?.chain()
                .focus()
                .setHeading({ level: event.target.value === "h2" ? 2 : 3 })
                .run();
          }}
        >
          <option value="p">Paragraph</option>
          <option value="h2">Heading</option>
          <option value="h3">Subheading</option>
        </select>
        {actions.map((action) => (
          <button
            key={action.name}
            type="button"
            aria-label={action.name}
            title={action.name}
            aria-pressed={action.active}
            disabled={disabled}
            onMouseDown={(e) => e.preventDefault()}
            onClick={action.run}
          >
            {action.label}
          </button>
        ))}
        <button
          type="button"
          aria-label="Insert or edit link"
          aria-pressed={editor?.isActive("link") || false}
          disabled={!editor || disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => {
            setHref(String(editor?.getAttributes("link").href || ""));
            setError("");
            setLinkOpen(!linkOpen);
          }}
        >
          Link
        </button>
        <button
          type="button"
          aria-label="Remove link"
          disabled={!editor || disabled || !editor.isActive("link")}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            editor?.chain().focus().extendMarkRange("link").unsetLink().run()
          }
        >
          Unlink
        </button>
        <button
          type="button"
          aria-label="Clear formatting"
          disabled={!editor || disabled}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() =>
            editor?.chain().focus().unsetAllMarks().clearNodes().run()
          }
        >
          Clear
        </button>
        <button
          type="button"
          aria-label="Undo"
          disabled={!editor || disabled || !editor.can().undo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().undo().run()}
        >
          ↶
        </button>
        <button
          type="button"
          aria-label="Redo"
          disabled={!editor || disabled || !editor.can().redo()}
          onMouseDown={(e) => e.preventDefault()}
          onClick={() => editor?.chain().focus().redo().run()}
        >
          ↷
        </button>
      </div>
      {linkOpen && (
        <div className="admin-rich-link">
          <label>
            Link URL
            <input
              type="text"
              value={href}
              onChange={(e) => setHref(e.target.value)}
              placeholder="https://example.com"
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  applyLink();
                }
                if (e.key === "Escape") setLinkOpen(false);
              }}
            />
          </label>
          <button type="button" disabled={disabled} onClick={applyLink}>
            Apply link
          </button>
          <button
            type="button"
            onClick={() => {
              setLinkOpen(false);
              editor?.commands.focus();
            }}
          >
            Cancel
          </button>
          {error && <p role="alert">{error}</p>}
        </div>
      )}
      <EditorContent editor={editor} />
      {!editor && <p className="admin-hint">Loading editor…</p>}
      <p className="admin-rich-help">
        Select text to format it. Ctrl/Cmd + B: bold · Ctrl/Cmd + I: italic ·
        Enter: new paragraph.
      </p>
    </div>
  );
}
