"use client";

import Image from "next/image";
import Link from "next/link";
import {
  getContentImageUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/contentImages";
import type { Recommendation } from "@/lib/recommendations";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function RecommendationCard({
  recommendation,
}: {
  recommendation: Recommendation;
}) {
  const coverImage = getContentImageUrl(recommendation);

  return (
    <Link
      href={`/preporuke/${recommendation.slug}`}
      className="group min-w-0 overflow-hidden rounded-[1.25rem] border border-[#5c4a3d]/10 bg-[#fdfaf6] shadow-sm transition-all hover:-translate-y-1 hover:shadow-xl sm:rounded-[1.5rem]"
    >
      <div className="relative h-52 bg-[#e8e0d5] sm:h-64">
        <Image
          src={coverImage}
          alt={recommendation.coverImageAlt ?? recommendation.title}
          fill
          sizes="(min-width: 768px) 33vw, 100vw"
          className="object-cover object-bottom transition-transform duration-500 group-hover:scale-105"
          style={{
            objectPosition:
              recommendation.coverImagePosition || "center bottom",
          }}
          unoptimized={shouldUseUnoptimizedImage(coverImage)}
        />
      </div>
      <div className="p-5 sm:p-7">
        {recommendation.category ? (
          <div className="mb-4 flex flex-wrap gap-2">
            <span className="rounded-full bg-[#5c4a3d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#fdfaf6]">
              {recommendation.category}
            </span>
          </div>
        ) : null}
        <div className="mb-4 flex flex-wrap items-center gap-3 text-sm font-semibold text-[#5c4a3d]/65">
          <time dateTime={recommendation.createdAt}>
            {formatDate(recommendation.createdAt)}
          </time>
        </div>
        <h2 className="font-serif text-2xl leading-tight text-[#4a382b] sm:text-3xl">
          {recommendation.title}
        </h2>
        <p className="mt-4 leading-7 text-[#5c4a3d]/75">
          {recommendation.description}
        </p>
      </div>
    </Link>
  );
}
