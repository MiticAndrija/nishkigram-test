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
  const imageAreaRef = useRef<HTMLDivElement>(null);
  const [selectedImage, setSelectedImage] = useState<HTMLImageElement | null>(null);
  const [imageAlt, setImageAlt] = useState("");
  const [decorative, setDecorative] = useState(false);
  const [imageBounds, setImageBounds] = useState<{
    top: number;
    left: number;
    width: number;
    height: number;
  } | null>(null);
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");

  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      editorRef.current.innerHTML = value;
      savedRangeRef.current = null;
    }
  }, [value]);

  useEffect(() => {
    if (!selectedImage) return;
    const updateBounds = () => {
      const area = imageAreaRef.current;
      if (!area || !editorRef.current?.contains(selectedImage)) {
        setSelectedImage(null);
        setImageBounds(null);
        return;
      }
      const imageRect = selectedImage.getBoundingClientRect();
      const areaRect = area.getBoundingClientRect();
      setImageBounds({
        top: imageRect.top - areaRect.top,
        left: imageRect.left - areaRect.left,
        width: imageRect.width,
        height: imageRect.height,
      });
    };
    const frame = requestAnimationFrame(updateBounds);
    const observer = new ResizeObserver(updateBounds);
    observer.observe(selectedImage);
    if (editorRef.current) observer.observe(editorRef.current);
    window.addEventListener("resize", updateBounds);
    return () => {
      cancelAnimationFrame(frame);
      observer.disconnect();
      window.removeEventListener("resize", updateBounds);
    };
  }, [selectedImage, value]);

  const selectImage = (image: HTMLImageElement, newlyInserted = false) => {
    if (image === selectedImage) return;
    setSelectedImage(image);
    setImageBounds(null);
    const alt = image.getAttribute("alt") ?? "";
    setImageAlt(alt);
    setDecorative(!newlyInserted && alt === "");
  };

  const saveSelection = () => {
    const selection = window.getSelection();
    const editor = editorRef.current;

    if (!selection?.rangeCount || !editor) {
      return;
    }

    const range = selection.getRangeAt(0);

    if (editor.contains(range.commonAncestorContainer)) {
      savedRangeRef.current = range.cloneRange();
    }
  };

  const restoreSelection = () => {
    const selection = window.getSelection();
    const range = savedRangeRef.current;

    if (
      !selection ||
      !range ||
      !editorRef.current?.contains(range.commonAncestorContainer)
    ) {
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

  const insertImage = (src: string) => {
    const editor = editorRef.current;
    if (!editor) return;
    const previousImages = new Set(editor.querySelectorAll("img"));
    const image = document.createElement("img");
    image.setAttribute("src", src);
    image.setAttribute("alt", "");
    insertHtml(image.outerHTML);
    const insertedImage = Array.from(editor.querySelectorAll("img")).find(
      (candidate) => !previousImages.has(candidate),
    );
    if (insertedImage) {
      selectImage(insertedImage, true);
      insertedImage.scrollIntoView({ block: "center" });
    }
  };

  const updateImageAlt = (alt: string) => {
    if (!selectedImage || !editorRef.current?.contains(selectedImage)) return;
    selectedImage.setAttribute("alt", alt);
    syncEditorValue();
  };

  const finishImageEdit = () => {
    updateImageAlt(decorative ? "" : imageAlt);
    editorRef.current?.focus();
    if (selectedImage && editorRef.current?.contains(selectedImage)) {
      const range = document.createRange();
      range.setStartAfter(selectedImage);
      range.collapse(true);
      const selection = window.getSelection();
      selection?.removeAllRanges();
      selection?.addRange(range);
      saveSelection();
    }
    setSelectedImage(null);
    setImageBounds(null);
  };

  const addImage = () => {
    const src = window.prompt("Unesite URL slike");
    if (src) insertImage(src);
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

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      const uploadedImage = await uploadAdminImage(file, uploadEndpoint, (percentage) =>
        setUploadMessage(`Uploadujem sliku... ${Math.round(percentage)}%`),
      );

      insertImage(uploadedImage.url);
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
        ref={imageAreaRef}
        className="relative"
        style={{ paddingBottom: selectedImage ? 190 : undefined }}
      >
        <div
          ref={editorRef}
          contentEditable
          role="textbox"
          aria-label={ariaLabel}
          onClick={(event) => {
            if (event.target instanceof HTMLImageElement) {
              event.preventDefault();
              selectImage(event.target);
            } else {
              setSelectedImage(null);
              setImageBounds(null);
            }
          }}
          onInput={(event) => {
            onChange(event.currentTarget.innerHTML);
            saveSelection();
          }}
          onKeyUp={() => {
            saveSelection();
            const selection = window.getSelection();
            const range = selection?.rangeCount ? selection.getRangeAt(0) : null;
            const node = range?.startContainer.childNodes[range.startOffset];
            if (range && !range.collapsed && node instanceof HTMLImageElement) {
              selectImage(node);
            }
          }}
          onMouseUp={saveSelection}
          onBlur={saveSelection}
          className="min-h-80 px-5 py-4 leading-8 text-[#4a382b] outline-none [&_a]:font-semibold [&_a]:text-[#5c4a3d] [&_h2]:font-serif [&_h2]:text-3xl [&_h3]:font-serif [&_h3]:text-2xl [&_iframe]:my-5 [&_iframe]:aspect-video [&_iframe]:h-auto [&_iframe]:w-full [&_iframe]:rounded-xl [&_img]:my-5 [&_img]:max-h-96 [&_img]:rounded-xl [&_img]:object-cover [&_li]:ml-6 [&_ol]:list-decimal [&_p]:mb-4 [&_strong]:font-bold [&_ul]:list-disc"
          suppressContentEditableWarning
        />
        {selectedImage && imageBounds ? (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-sm outline-2 outline-offset-2 outline-[#8b6f56]"
              style={imageBounds}
            />
            <div
              role="group"
              aria-label="Selected image"
              className="absolute left-3 right-3 z-10 rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] p-3 text-sm text-[#4a382b] shadow-md sm:left-5 sm:right-auto sm:w-96 sm:max-w-[calc(100%-2.5rem)]"
              style={{ top: imageBounds.top + imageBounds.height + 8 }}
              onKeyDown={(event) => {
                if (event.key === "Enter" || event.key === "Escape") {
                  event.preventDefault();
                  finishImageEdit();
                }
              }}
            >
              <p className="mb-2 font-semibold">Selected image</p>
              <label className="block">
                <span className="mb-1 block">Alt text</span>
                <input
                  value={decorative ? "" : imageAlt}
                  disabled={decorative}
                  onChange={(event) => {
                    setImageAlt(event.target.value);
                    updateImageAlt(event.target.value);
                  }}
                  className="w-full rounded-md border border-[#5c4a3d]/20 bg-[#fdfaf6] px-3 py-2 outline-none focus:ring-2 focus:ring-[#5c4a3d]/20 disabled:opacity-50"
                />
              </label>
              <div className="mt-3 flex items-center gap-4">
                <button
                  type="button"
                  onClick={finishImageEdit}
                  className="rounded-md bg-[#5c4a3d] px-4 py-2 font-semibold text-[#fdfaf6] hover:bg-[#47382f]"
                >
                  Save
                </button>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={decorative}
                    onChange={(event) => {
                      setDecorative(event.target.checked);
                      updateImageAlt(event.target.checked ? "" : imageAlt);
                    }}
                  />
                  Decorative image
                </label>
              </div>
            </div>
          </>
        ) : null}
      </div>
    </div>
  );
}
