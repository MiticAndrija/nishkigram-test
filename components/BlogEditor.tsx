"use client";

import { ChangeEvent, useEffect, useId, useRef, useState } from "react";
import {
  adminImageAccept,
  uploadAdminImage,
} from "@/lib/adminImageUploadClient";

type BlogEditorProps = {
  value: string;
  onChange: (value: string) => void;
  uploadEndpoint?: string;
  ariaLabel?: string;
};

const toolbarButtons = [
  { label: "B", title: "Bold", command: "bold" },
  { label: "I", title: "Italic", command: "italic" },
  { label: "H2", title: "Heading 2", command: "formatBlock", value: "h2" },
  { label: "H3", title: "Heading 3", command: "formatBlock", value: "h3" },
  { label: "P", title: "Paragraph", command: "formatBlock", value: "p" },
  { label: "UL", title: "Bullet list", command: "insertUnorderedList" },
  { label: "OL", title: "Numbered list", command: "insertOrderedList" },
];

export default function BlogEditor({
  value,
  onChange,
  uploadEndpoint = "/api/admin/blog/upload",
  ariaLabel = "Sadržaj blog objave",
}: BlogEditorProps) {
  const uploadInputId = useId();
  const editorRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const savedRangeRef = useRef<Range | null>(null);
  const selectedImageRef = useRef<HTMLImageElement | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      selectedImageRef.current = null;
    }
  }, [value]);

  const saveSelection = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;

    if (!selection?.rangeCount || !editor) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
      const node = range.startContainer.childNodes[range.startOffset];
      selectedImageRef.current =
        !range.collapsed && node instanceof HTMLImageElement ? node : null;
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedRangeRef.current;

    if (!selection || !range) {
      return false;
    }

    selection.removeAllRanges();
    selection.addRange(range);
    return true;
  };

  const syncEditorValue = () => {
    onChange(editorRef.current?.innerHTML ?? "");
  };

  const insertHtml = (html: string) => {
    const editor = editorRef.current;

    if (!editor) {
      return;
    }

    editor.focus();

    if (restoreSelection()) {
      document.execCommand("insertHTML", false, html);
    } else {
      editor.insertAdjacentHTML("beforeend", html);
    }

    syncEditorValue();
    saveSelection();
  };

  const runCommand = (command: string, commandValue?: string) => {
    editorRef.current?.focus();
    restoreSelection();
    document.execCommand(command, false, commandValue);
    syncEditorValue();
    saveSelection();
  };

  const addLink = () => {
    const href = window.prompt("Unesite link");

    if (href) {
      runCommand("createLink", href);
    }
  };

  const insertImage = (src: string, alt: string) => {
    const image = document.createElement("img");
    image.setAttribute("src", src);
    image.setAttribute("alt", alt);
    insertHtml(image.outerHTML);
  };

  const editImageAlt = () => {
    const image = selectedImageRef.current;
    if (!image || !editorRef.current?.contains(image)) {
      window.alert("Select an image in the editor first, then choose Image alt text.");
      return;
    }
    const alt = window.prompt(
      "Image alt text (leave empty for a decorative image)",
      image.getAttribute("alt") ?? "",
    );
    if (alt !== null) {
      image.setAttribute("alt", alt);
      syncEditorValue();
    }
  };

  const addImage = () => {
    const src = window.prompt("Unesite URL slike");

    if (src) {
      const alt = window.prompt("Image alt text (leave empty for a decorative image)", "");
      if (alt !== null) insertImage(src, alt);
    }
  };

  const addYoutube = () => {
    const url = window.prompt("Unesite YouTube link");

    if (!url) {
      return;
    }

    const videoId =
      url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{6,})/)?.[1] ??
      url.match(/youtube\.com\/embed\/([A-Za-z0-9_-]{6,})/)?.[1] ??
      "";

    if (!videoId) {
      setUploadStatus("error");
      setUploadMessage("YouTube link nije ispravan.");
      return;
    }

    insertHtml(
      `<iframe src="https://www.youtube.com/embed/${videoId}" title="YouTube video" allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share" allowfullscreen></iframe>`,
    );
  };

  const uploadImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    const alt = window.prompt("Image alt text (leave empty for a decorative image)", "");
    if (alt === null) {
      event.target.value = "";
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      const uploadedImage = await uploadAdminImage(file, uploadEndpoint, (percentage) =>
        setUploadMessage(`Uploadujem sliku... ${Math.round(percentage)}%`),
      );

      insertImage(uploadedImage.url, alt);
      setUploadStatus("success");
      setUploadMessage("Slika je ubačena u tekst.");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(
        error instanceof Error ? error.message : "Upload slike nije uspeo.",
      );
    } finally {
      event.target.value = "";
    }
  };

  return (
    <div className="overflow-hidden rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6]">
      <div className="flex flex-wrap gap-2 border-b border-[#5c4a3d]/10 p-3">
        {toolbarButtons.map((button) => (
          <button
            key={`${button.command}-${button.value ?? button.label}`}
            type="button"
            title={button.title}
            onMouseDown={saveSelection}
            onClick={() => runCommand(button.command, button.value)}
            className="h-9 min-w-9 rounded-md border border-[#5c4a3d]/15 px-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
          >
            {button.label}
          </button>
        ))}
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={addLink}
          className="h-9 rounded-md border border-[#5c4a3d]/15 px-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
        >
          Link
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={addImage}
          className="h-9 rounded-md border border-[#5c4a3d]/15 px-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
        >
          URL slika
        </button>
        <button
          type="button"
          onMouseDown={(event) => event.preventDefault()}
          onClick={editImageAlt}
          title="Select an image in the editor to edit its alt text"
          className="h-9 rounded-md border border-[#5c4a3d]/15 px-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
        >
          Image alt text
        </button>
        <button
          type="button"
          onMouseDown={saveSelection}
          onClick={addYoutube}
          className="h-9 rounded-md border border-[#5c4a3d]/15 px-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
        >
          YouTube
        </button>
        <input
          ref={fileInputRef}
          type="file"
          accept={adminImageAccept}
          onChange={uploadImage}
          className="sr-only"
          id={uploadInputId}
        />
        <label
          htmlFor={uploadInputId}
          onMouseDown={saveSelection}
          className="flex h-9 cursor-pointer items-center rounded-md border border-[#5c4a3d]/15 px-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
        >
          Upload slika
        </label>
      </div>
      {uploadStatus !== "idle" ? (
        <p
          className={`border-b border-[#5c4a3d]/10 px-5 py-2 text-sm font-semibold ${
            uploadStatus === "error" ? "text-red-700" : "text-[#5c4a3d]"
          }`}
        >
          {uploadStatus === "uploading"
            ? uploadMessage || "Uploadujem sliku..."
            : uploadMessage}
        </p>
      ) : null}
      <div
        ref={editorRef}
        contentEditable
        role="textbox"
        aria-label={ariaLabel}
        onClick={(event) => {
          if (event.target instanceof HTMLImageElement) {
            const range = document.createRange();
            range.selectNode(event.target);
            const selection = window.getSelection();
            selection?.removeAllRanges();
            selection?.addRange(range);
            saveSelection();
          }
        }}
        onInput={(event) => {
          onChange(event.currentTarget.innerHTML);
          saveSelection();
        }}
        onKeyUp={saveSelection}
        onMouseUp={saveSelection}
        onBlur={saveSelection}
        className="min-h-80 px-5 py-4 leading-8 text-[#4a382b] outline-none [&_a]:font-semibold [&_a]:text-[#5c4a3d] [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_iframe]:my-5 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-xl [&_img]:my-5 [&_img]:max-h-96 [&_img]:rounded-xl [&_img]:object-cover [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_strong]:font-bold [&_ul]:list-disc"
        suppressContentEditableWarning
      />
    </div>
  );
}
