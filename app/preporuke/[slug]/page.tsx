import Image from "next/image";
import Link from "next/link";
import { notFound } from "next/navigation";
import BlogPostContent from "@/components/BlogPostContent";
import Navbar from "@/components/Navbar";
import {
  getContentImageUrl,
  shouldUseUnoptimizedImage,
} from "@/lib/contentImages";
import { getPublishedRecommendationBySlug } from "@/lib/recommendations";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function formatDate(value: string) {
  return new Intl.DateTimeFormat("sr-RS", {
    day: "2-digit",
    month: "long",
    year: "numeric",
  }).format(new Date(value));
}

export default async function RecommendationPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const recommendation = await getPublishedRecommendationBySlug(slug, true);

  if (!recommendation) {
    notFound();
  }

  const coverImage = getContentImageUrl(recommendation);

  return (
    <div className="min-h-screen bg-[#f4efe6] font-sans selection:bg-[#5c4a3d]/20">
      <Navbar />
      <main className="pt-24">
        <article>
          <header className="px-4 pb-10 pt-12 sm:px-6 md:px-10 md:pt-14">
            <div className="mx-auto max-w-4xl text-center">
              <Link
                href="/preporuke"
                className="text-sm font-semibold uppercase tracking-[0.22em] text-[#8b6f56] hover:text-[#5c4a3d]"
              >
                Preporuke
              </Link>
              <h1 className="mt-6 font-serif text-4xl leading-tight text-[#4a382b] sm:text-5xl md:text-7xl">
                {recommendation.title}
              </h1>
              <div className="mt-6 flex flex-wrap justify-center gap-3 text-sm font-semibold text-[#5c4a3d]/65">
                <time dateTime={recommendation.createdAt}>
                  {formatDate(recommendation.createdAt)}
                </time>
              </div>
              {recommendation.category ? (
                <div className="mt-5 flex flex-wrap justify-center gap-2">
                  <span className="rounded-full bg-[#5c4a3d] px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#fdfaf6]">
                    {recommendation.category}
                  </span>
                </div>
              ) : null}
              <p className="mx-auto mt-6 max-w-2xl text-lg leading-8 text-[#5c4a3d]/80 sm:mt-8 sm:text-xl sm:leading-9">
                {recommendation.description}
              </p>
            </div>
          </header>

          <div className="px-4 sm:px-6 md:px-10">
            <div className="relative mx-auto h-72 max-w-6xl overflow-hidden rounded-3xl bg-[#e8e0d5] shadow-2xl sm:h-[420px] sm:rounded-[2rem]">
              <Image
                src={coverImage}
                alt={recommendation.coverImageAlt ?? recommendation.title}
                fill
                sizes="100vw"
                className="object-cover object-bottom"
                style={{
                  objectPosition:
                    recommendation.coverImagePosition || "center bottom",
                }}
                priority
                unoptimized={shouldUseUnoptimizedImage(coverImage)}
              />
            </div>
          </div>

          <section className="px-4 py-12 sm:px-6 md:px-10 md:py-24">
            <BlogPostContent html={recommendation.contentHtml} />
          </section>
        </article>
      </main>
    </div>
  );
}
