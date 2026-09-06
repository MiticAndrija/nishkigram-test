"use client";

import Image from "next/image";
import Link from "next/link";
import { MotionConfig, motion } from "motion/react";
import type { BlogPost } from "@/lib/blog";
import { getContentImageUrl, shouldUseUnoptimizedImage } from "@/lib/contentImages";

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default function FeaturedBlogCard({ post }: { post: BlogPost }) {
  const coverImage = getContentImageUrl(post);

  return (
    <MotionConfig reducedMotion="user">
    <motion.article
      initial={{ opacity: 0, y: 36 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 0.18 }}
      transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
      className="group overflow-hidden rounded-[1.75rem] border border-[#5c4a3d]/10 bg-[#fdfaf6] shadow-sm md:rounded-[2.5rem]"
    >
      <Link href={`/blog/${post.slug}`} className="grid md:grid-cols-[1.3fr_0.7fr]">
        <div className="relative min-h-[320px] overflow-hidden bg-[#e8e0d5] sm:min-h-[440px] md:min-h-[570px]">
          <Image
            src={coverImage}
            alt={post.coverImageAlt ?? post.title}
            fill
            sizes="(min-width: 768px) 65vw, 100vw"
            className="object-cover transition-transform duration-700 group-hover:scale-[1.025]"
            style={{ objectPosition: post.coverImagePosition || "center bottom" }}
            unoptimized={shouldUseUnoptimizedImage(coverImage)}
          />
        </div>
        <div className="flex flex-col justify-between p-6 sm:p-9 md:p-10 lg:p-12">
          <div>
            {post.category ? (
              <p className="text-xs font-bold uppercase tracking-[0.22em] text-[#8b6f56]">
                {post.category}
              </p>
            ) : null}
            <h3 className="mt-5 font-serif text-3xl leading-tight text-[#4a382b] sm:text-4xl lg:text-5xl">
              {post.title}
            </h3>
            <p className="mt-5 leading-7 text-[#5c4a3d]/75 sm:text-lg sm:leading-8">
              {post.excerpt}
            </p>
          </div>
          <div className="mt-9 border-t border-[#5c4a3d]/10 pt-6">
            <time className="block text-sm font-semibold text-[#5c4a3d]/60" dateTime={post.createdAt}>
              {formatDate(post.createdAt)}
            </time>
            <span className="mt-4 inline-flex min-h-11 items-center gap-2 font-semibold text-[#5c4a3d] group-hover:underline">
              Pročitaj celu priču <span aria-hidden="true">→</span>
            </span>
          </div>
        </div>
      </Link>
    </motion.article>
    </MotionConfig>
  );
}
