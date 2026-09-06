"use client";

import { ChangeEvent, FormEvent, useMemo, useRef, useState } from "react";
import BlogEditor from "@/components/BlogEditor";
import BlogPostContent from "@/components/BlogPostContent";
import CoverImageFocusPicker from "@/components/CoverImageFocusPicker";
import {
  adminImageAccept,
  uploadAdminImage,
} from "@/lib/adminImageUploadClient";
import type { BlogPost, BlogPostInput } from "@/lib/blog";
import { normalizeTags } from "@/lib/blogMeta";
import {
  unsavedChangesConfirmationMessage,
  useUnsavedChangesWarning,
} from "@/lib/useUnsavedChangesWarning";

type BlogFormProps = {
  post?: BlogPost | null;
  categories: string[];
  onSaved: () => void;
  onCancelEdit: () => void;
};

const emptyForm: BlogPostInput = {
  title: "",
  slug: "",
  excerpt: "",
  category: "",
  tags: [],
  author: "Niškigram",
  coverImage: "/images/nis-hero.png",
  coverImageAlt: "",
  coverImagePosition: "center bottom",
  contentHtml: "<p></p>",
  published: true,
};

const coverImagePositions = [
  { label: "Centar", value: "center center" },
  { label: "Gore", value: "center top" },
  { label: "Dole", value: "center bottom" },
  { label: "Levo", value: "left center" },
  { label: "Desno", value: "right center" },
];

function postToForm(post?: BlogPost | null): BlogPostInput {
  return post
    ? {
        title: post.title,
        slug: post.slug,
        excerpt: post.excerpt,
        category: post.category ?? "",
        tags: post.tags ?? [],
        author: post.author,
        coverImage: post.coverImage,
        coverImageAlt: post.coverImageAlt ?? post.title,
        coverImagePosition: post.coverImagePosition ?? "center bottom",
        contentHtml: post.contentHtml,
        published: post.published,
      }
    : emptyForm;
}

function slugFromTitle(title: string) {
  return title
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export default function BlogForm({
  post,
  categories,
  onSaved,
  onCancelEdit,
}: BlogFormProps) {
  const [form, setForm] = useState<BlogPostInput>(() => postToForm(post));
  const [tagsInput, setTagsInput] = useState(() =>
    (postToForm(post).tags ?? []).join(", "),
  );
  const [status, setStatus] = useState<"idle" | "saving" | "error">("idle");
  const [uploadStatus, setUploadStatus] = useState<
    "idle" | "uploading" | "success" | "error"
  >("idle");
  const [uploadMessage, setUploadMessage] = useState("");
  const [error, setError] = useState("");
  const fileInputRef = useRef<HTMLInputElement>(null);
  const initialForm = useMemo(() => postToForm(post), [post]);
  const isDirty = JSON.stringify(form) !== JSON.stringify(initialForm);

  useUnsavedChangesWarning(isDirty && status !== "saving");

  const previewDate = useMemo(() => new Date().toISOString(), []);
  const categoryOptions = useMemo(() => {
    const currentCategory = form.category?.trim();

    if (currentCategory && !categories.includes(currentCategory)) {
      return [currentCategory, ...categories];
    }

    return categories;
  }, [categories, form.category]);

  const uploadCoverImage = async (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];

    if (!file) {
      return;
    }

    setUploadStatus("uploading");
    setUploadMessage("");

    try {
      const uploadedImage = await uploadAdminImage(
        file,
        "/api/admin/blog/upload",
        (percentage) =>
          setUploadMessage(`Uploadujem sliku... ${Math.round(percentage)}%`),
      );
      setForm((current) => ({ ...current, coverImage: uploadedImage.url }));
      setUploadStatus("success");
      setUploadMessage("Slika je uploadovana.");
    } catch (error) {
      setUploadStatus("error");
      setUploadMessage(
        error instanceof Error ? error.message : "Upload slike nije uspeo.",
      );
    } finally {
      event.target.value = "";
    }
  };

  const removeCoverImage = () => {
    setForm((current) => ({ ...current, coverImage: "" }));
    setUploadStatus("idle");
    setUploadMessage("");
    fileInputRef.current?.focus();
  };

  const cancelEdit = () => {
    if (isDirty && !window.confirm(unsavedChangesConfirmationMessage)) {
      return;
    }

    onCancelEdit();
  };

  const submit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setStatus("saving");
    setError("");

    const endpoint = post ? `/api/admin/blog/${post.id}` : "/api/admin/blog";
    const method = post ? "PUT" : "POST";

    try {
      const response = await fetch(endpoint, {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      if (!response.ok) {
        const payload = (await response.json().catch(() => ({}))) as {
          error?: string;
        };
        setStatus("error");
        setError(payload.error || `Čuvanje nije uspelo (HTTP ${response.status}).`);
        return;
      }

      setStatus("idle");
      setForm(emptyForm);
      setTagsInput("");
      onSaved();
    } catch {
      setStatus("error");
      setError("Veza sa serverom nije uspela. Pokušajte ponovo.");
    }
  };

  return (
    <form
      onSubmit={submit}
      className="grid gap-7 rounded-[1.5rem] border border-[#5c4a3d]/10 bg-[#f4efe6] p-6 lg:grid-cols-[1.05fr_0.95fr]"
    >
      <div className="grid gap-4">
        <div>
          <p className="text-sm font-semibold uppercase tracking-[0.18em] text-[#8b6f56]">
            {post ? "Izmena objave" : "Nova objava"}
          </p>
          <h2 className="mt-2 font-serif text-3xl text-[#4a382b]">
            Blog forma
          </h2>
        </div>

        <label>
          <span className="mb-2 block font-semibold text-[#4a382b]">Naslov</span>
          <input
            value={form.title}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                title: event.target.value,
                slug: current.slug || slugFromTitle(event.target.value),
              }))
            }
            required
            className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
          />
        </label>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block font-semibold text-[#4a382b]">Slug</span>
            <input
              value={form.slug}
              onChange={(event) =>
                setForm((current) => ({ ...current, slug: event.target.value }))
              }
              className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
            />
          </label>
          <label>
            <span className="mb-2 block font-semibold text-[#4a382b]">Autor</span>
            <input
              value={form.author}
              onChange={(event) =>
                setForm((current) => ({ ...current, author: event.target.value }))
              }
              required
              className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
            />
          </label>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <label>
            <span className="mb-2 block font-semibold text-[#4a382b]">
              Kategorija
            </span>
            <select
              value={form.category ?? ""}
              onChange={(event) =>
                setForm((current) => ({
                  ...current,
                  category: event.target.value,
                }))
              }
              className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
            >
              <option value="">Bez kategorije</option>
              {categoryOptions.map((category) => (
                <option key={category} value={category}>
                  {category}
                </option>
              ))}
            </select>
          </label>
          <label>
            <span className="mb-2 block font-semibold text-[#4a382b]">
              Tagovi
            </span>
            <input
              value={tagsInput}
              onChange={(event) => {
                setTagsInput(event.target.value);
                setForm((current) => ({
                  ...current,
                  tags: normalizeTags(event.target.value),
                }));
              }}
              placeholder="npr. Nis, trening, vodic"
              className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
            />
          </label>
        </div>

        <label>
          <span className="mb-2 block font-semibold text-[#4a382b]">Excerpt</span>
          <textarea
            value={form.excerpt}
            onChange={(event) =>
              setForm((current) => ({ ...current, excerpt: event.target.value }))
            }
            required
            rows={3}
            className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
          />
        </label>

        <label>
          <span className="mb-2 block font-semibold text-[#4a382b]">
            Cover image URL
          </span>
          <input
            value={form.coverImage}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                coverImage: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
          />
        </label>

        <label>
          <span className="mb-2 block font-semibold text-[#4a382b]">
            Image alt text
          </span>
          <input
            value={form.coverImageAlt ?? ""}
            onChange={(event) =>
              setForm((current) => ({ ...current, coverImageAlt: event.target.value }))
            }
            className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
          />
          <span className="mt-2 block text-sm text-[#5c4a3d]/70">
            Describe the image. Leave empty if it is decorative.
          </span>
        </label>

        <div className="grid gap-3 rounded-lg border border-[#5c4a3d]/15 bg-[#fdfaf6] p-4">
          <div className="flex flex-wrap items-center gap-3">
            <input
              ref={fileInputRef}
              type="file"
              accept={adminImageAccept}
              onChange={uploadCoverImage}
              className="sr-only"
              id="cover-image-upload"
            />
            <label
              htmlFor="cover-image-upload"
              className="cursor-pointer rounded-lg bg-[#5c4a3d] px-5 py-3 text-sm font-semibold text-[#fdfaf6] transition-colors hover:bg-[#47382f]"
            >
              Upload cover slike
            </label>
            {form.coverImage ? (
              <button
                type="button"
                onClick={removeCoverImage}
                className="rounded-lg border border-[#5c4a3d]/25 px-5 py-3 text-sm font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
              >
                Ukloni sliku
              </button>
            ) : null}
          </div>
          <p className="text-sm text-[#5c4a3d]/70">
            JPG, JPEG, PNG ili WEBP, najviše 50 MB.
          </p>
          {uploadStatus === "uploading" ? (
            <p className="text-sm font-semibold text-[#5c4a3d]">
              {uploadMessage || "Uploadujem..."}
            </p>
          ) : null}
          {uploadMessage ? (
            <p
              className={`text-sm font-semibold ${
                uploadStatus === "error" ? "text-red-700" : "text-green-800"
              }`}
            >
              {uploadMessage}
            </p>
          ) : null}
          {form.coverImage ? (
            <CoverImageFocusPicker
              imageUrl={form.coverImage}
              alt={form.coverImageAlt ?? form.title}
              value={form.coverImagePosition}
              heightClass="h-56"
              onChange={(coverImagePosition) =>
                setForm((current) => ({ ...current, coverImagePosition }))
              }
            />
          ) : null}
        </div>

        <label>
          <span className="mb-2 block font-semibold text-[#4a382b]">
            Fokus cover slike za brzi izbor
          </span>
          <select
            value={form.coverImagePosition ?? "center bottom"}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                coverImagePosition: event.target.value,
              }))
            }
            className="w-full rounded-lg border border-[#5c4a3d]/20 bg-[#fdfaf6] px-4 py-3 text-[#4a382b] outline-none focus:ring-4 focus:ring-[#5c4a3d]/15"
          >
            {coverImagePositions.map((position) => (
              <option key={position.value} value={position.value}>
                {position.label}
              </option>
            ))}
          </select>
        </label>

        <label className="flex items-center gap-3 font-semibold text-[#4a382b]">
          <input
            type="checkbox"
            checked={form.published}
            onChange={(event) =>
              setForm((current) => ({
                ...current,
                published: event.target.checked,
              }))
            }
            className="h-5 w-5 accent-[#5c4a3d]"
          />
          Objavljeno
        </label>

        <div>
          <span className="mb-2 block font-semibold text-[#4a382b]">Sadržaj</span>
          <BlogEditor
            value={form.contentHtml}
            onChange={(contentHtml) =>
              setForm((current) => ({ ...current, contentHtml }))
            }
          />
        </div>

        {error ? <p className="font-semibold text-red-700">{error}</p> : null}

        <div className="flex flex-wrap gap-3">
          <button
            type="submit"
            disabled={status === "saving"}
            className="rounded-lg bg-[#5c4a3d] px-6 py-3 font-semibold text-[#fdfaf6] transition-colors hover:bg-[#47382f] disabled:opacity-60"
          >
            {status === "saving" ? "Čuvam..." : post ? "Sačuvaj izmene" : "Kreiraj objavu"}
          </button>
          {post ? (
            <button
              type="button"
              onClick={cancelEdit}
              className="rounded-lg border border-[#5c4a3d]/25 px-6 py-3 font-semibold text-[#5c4a3d] transition-colors hover:bg-[#5c4a3d]/8"
            >
              Odustani
            </button>
          ) : null}
        </div>
      </div>

      <article className="rounded-[1.25rem] border border-[#5c4a3d]/10 bg-[#fdfaf6] p-6">
        <p className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#8b6f56]">
          Preview
        </p>
        <h3 className="font-serif text-3xl text-[#4a382b]">
          {form.title || "Naslov objave"}
        </h3>
        {form.coverImage ? (
          <div className="mt-5 overflow-hidden rounded-xl bg-[#e8e0d5]">
            <CoverImageFocusPicker
              imageUrl={form.coverImage}
              alt={form.coverImageAlt ?? form.title}
              value={form.coverImagePosition}
              heightClass="h-64"
              onChange={(coverImagePosition) =>
                setForm((current) => ({ ...current, coverImagePosition }))
              }
            />
          </div>
        ) : null}
        <p className="mt-3 text-sm font-semibold text-[#5c4a3d]/65">
          {form.author || "Autor"} /{" "}
          {new Intl.DateTimeFormat("sr-RS").format(new Date(previewDate))}
        </p>
        {form.category || form.tags?.length ? (
          <div className="mt-4 flex flex-wrap gap-2">
            {form.category ? (
              <span className="rounded-full bg-[#5c4a3d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#fdfaf6]">
                {form.category}
              </span>
            ) : null}
            {form.tags?.map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#5c4a3d]/20 px-3 py-1 text-xs font-semibold text-[#5c4a3d]"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <p className="mt-5 leading-7 text-[#5c4a3d]/75">
          {form.excerpt || "Kratak opis objave."}
        </p>
        <div className="mt-8 border-t border-[#5c4a3d]/10 pt-6">
          <BlogPostContent html={form.contentHtml} />
        </div>
      </article>
    </form>
  );
}
