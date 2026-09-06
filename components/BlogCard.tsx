"use client";

import Image from "next/image";
import Link from "next/link";
import type { BlogPost } from "@/lib/blog";
import {
  getContentImageUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/contentImages";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function BlogCard({ post }: { post: BlogPost }) {
  const coverImage = getContentImageUrl(post);

  return (
    <Link
      href={`/blog/${post.slug}`}
      className="group min-w-0 overflow-hidden rounded-[1.25rem] border border-[#5c4a3d]/10 bg-[#fdfaf6] shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:rounded-[1.5rem]"
    >
      <div className="relative h-52 bg-[#e8e0d5] sm:h-64">
        <Image
          src={coverImage}
          alt={post.coverImageAlt ?? post.title}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
          style={{ objectPosition: post.coverImagePosition || "center bottom" }}
          unoptimized={shouldUseUnoptimizedImage(coverImage)}
        />
      </div>
      <div className="p-5 sm:p-7">
        {post.category || post.tags?.length ? (
          <div className="mb-4 flex flex-wrap gap-2">
            {post.category ? (
              <span className="rounded-full bg-[#5c4a3d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#fdfaf6]">
                {post.category}
              </span>
            ) : null}
            {post.tags?.slice(0, 3).map((tag) => (
              <span
                key={tag}
                className="rounded-full border border-[#5c4a3d]/20 px-3 py-1 text-xs font-semibold text-[#5c4a3d]"
              >
                #{tag}
              </span>
            ))}
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#5c4a3d]/65">
          <span>{post.author}</span>
          <span aria-hidden="true">/</span>
          <time dateTime={post.createdAt}>{formatDate(post.createdAt)}</time>
        </div>
        <h2 className="font-serif text-2xl leading-tight text-[#4a382b] sm:text-3xl">
          {post.title}
        </h2>
        <p className="mt-4 leading-7 text-[#5c4a3d]/75">{post.excerpt}</p>
      </div>
    </Link>
  );
}
