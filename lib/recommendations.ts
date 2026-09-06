import { removeUnusedBlogUploads } from "@/lib/blogUploads";
import { normalizeCategory } from "@/lib/blogMeta";
import { defaultCoverImage, getContentImageUrl } from "@/lib/contentImages";
import { getRecommendationCategories } from "@/lib/recommendationCategories";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { readJsonFile, writeJsonFile } from "@/lib/github";
import { slugify } from "@/lib/blog";

export type Recommendation = {
  id: string;
  title: string;
  slug: string;
  description: string;
  category?: string;
  coverImage: string;
  coverImageAlt?: string;
  coverImagePosition?: string;
  contentHtml: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type RecommendationWithLegacyImage = Recommendation & {
  imageUrl?: string;
  image?: string;
};

export type RecommendationInput = {
  title: string;
  slug?: string;
  description: string;
  category?: string;
  coverImage: string;
  coverImageAlt?: string;
  coverImagePosition?: string;
  contentHtml: string;
  published: boolean;
};

const recommendationsDataPath = "data/recommendations.json";

function sortRecommendations(recommendations: Recommendation[]) {
  return [...recommendations].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

function uniqueSlug(
  baseSlug: string,
  recommendations: Recommendation[],
  ignoredId?: string,
) {
  const base = baseSlug || "preporuka";
  let candidate = base;
  let index = 2;

  while (
    recommendations.some(
      (recommendation) =>
        recommendation.slug === candidate && recommendation.id !== ignoredId,
    )
  ) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export async function getAllRecommendations(forceLive = true) {
  const { data } = await readJsonFile<RecommendationWithLegacyImage[]>(
    recommendationsDataPath,
    [],
    forceLive,
  );
  return sortRecommendations(
    data.map((recommendation) => ({
      ...recommendation,
      coverImage: getContentImageUrl(recommendation),
    })),
  );
}

export async function getPublishedRecommendations(forceLive = true) {
  const recommendations = await getAllRecommendations(forceLive);
  return recommendations.filter((recommendation) => recommendation.published);
}

export async function getPublishedRecommendationBySlug(
  slug: string,
  forceLive = true,
) {
  const recommendations = await getPublishedRecommendations(forceLive);
  return (
    recommendations.find((recommendation) => recommendation.slug === slug) ??
    null
  );
}

export async function getRecommendationById(id: string, forceLive = false) {
  const recommendations = await getAllRecommendations(forceLive);
  return recommendations.find((recommendation) => recommendation.id === id) ?? null;
}

export async function createRecommendation(input: RecommendationInput) {
  const { data: recommendations, sha } = await readJsonFile<Recommendation[]>(
    recommendationsDataPath,
    [],
    true,
  );
  const categories = await getRecommendationCategories(true);
  const now = new Date().toISOString();
  const slug = uniqueSlug(slugify(input.slug || input.title), recommendations);

  const recommendation: Recommendation = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    slug,
    description: input.description.trim(),
    category: normalizeCategory(input.category, categories),
    coverImage: input.coverImage.trim() || defaultCoverImage,
    coverImageAlt: input.coverImageAlt,
    coverImagePosition: input.coverImagePosition || "center bottom",
    contentHtml: sanitizeHtml(input.contentHtml),
    published: input.published,
    createdAt: now,
    updatedAt: now,
  };

  const updatedRecommendations = [recommendation, ...recommendations];
  await writeJsonFile(
    recommendationsDataPath,
    updatedRecommendations,
    `Create recommendation: ${recommendation.title}`,
    sha,
  );
  return recommendation;
}

export async function updateRecommendation(
  id: string,
  input: RecommendationInput,
) {
  const { data: recommendations, sha } = await readJsonFile<Recommendation[]>(
    recommendationsDataPath,
    [],
    true,
  );
  const categories = await getRecommendationCategories(true);
  const existing = recommendations.find(
    (recommendation) => recommendation.id === id,
  );

  if (!existing) {
    return null;
  }

  const slug = uniqueSlug(slugify(input.slug || input.title), recommendations, id);
  const categoryOptions = existing.category
    ? [existing.category, ...categories]
    : categories;
  const updatedRecommendation: Recommendation = {
    ...existing,
    title: input.title.trim(),
    slug,
    description: input.description.trim(),
    category: normalizeCategory(input.category, categoryOptions),
    coverImage: input.coverImage.trim() || defaultCoverImage,
    coverImageAlt: input.coverImageAlt ?? existing.coverImageAlt,
    coverImagePosition: input.coverImagePosition || "center bottom",
    contentHtml: sanitizeHtml(input.contentHtml),
    published: input.published,
    updatedAt: new Date().toISOString(),
  };

  const updatedRecommendations = recommendations.map((recommendation) =>
    recommendation.id === id ? updatedRecommendation : recommendation,
  );
  await writeJsonFile(
    recommendationsDataPath,
    updatedRecommendations,
    `Update recommendation: ${updatedRecommendation.title}`,
    sha,
  );
  return updatedRecommendation;
}

export async function deleteRecommendation(id: string) {
  const { data: recommendations, sha } = await readJsonFile<Recommendation[]>(
    recommendationsDataPath,
    [],
    true,
  );
  const deletedRecommendation = recommendations.find(
    (recommendation) => recommendation.id === id,
  );
  const nextRecommendations = recommendations.filter(
    (recommendation) => recommendation.id !== id,
  );

  if (nextRecommendations.length === recommendations.length) {
    return false;
  }

  await writeJsonFile(
    recommendationsDataPath,
    nextRecommendations,
    `Delete recommendation: ${deletedRecommendation?.title || id}`,
    sha,
  );

  if (deletedRecommendation) {
    try {
      await removeUnusedBlogUploads(deletedRecommendation, nextRecommendations);
    } catch (error) {
      console.warn(
        "Recommendation deleted, but uploaded image cleanup failed.",
        error,
      );
    }
  }

  return true;
}

export async function renameRecommendationCategoryReferences(
  currentCategory: string,
  nextCategory: string,
) {
  const normalizedCurrentCategory = currentCategory.trim();
  const normalizedNextCategory = nextCategory.trim();

  if (!normalizedCurrentCategory || !normalizedNextCategory) {
    return;
  }

  const { data: recommendations, sha } = await readJsonFile<Recommendation[]>(
    recommendationsDataPath,
    [],
    true,
  );
  const updatedRecommendations = recommendations.map((recommendation) =>
    recommendation.category === normalizedCurrentCategory
      ? {
          ...recommendation,
          category: normalizedNextCategory,
          updatedAt: new Date().toISOString(),
        }
      : recommendation,
  );

  if (
    updatedRecommendations.every(
      (recommendation, index) => recommendation === recommendations[index],
    )
  ) {
    return;
  }

  await writeJsonFile(
    recommendationsDataPath,
    updatedRecommendations,
    `Rename recommendation category references: ${normalizedCurrentCategory}`,
    sha,
  );
}
