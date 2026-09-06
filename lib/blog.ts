import { getBlogCategories } from "@/lib/blogCategories";
import { removeUnusedBlogUploads } from "@/lib/blogUploads";
import { normalizeCategory, normalizeTags } from "@/lib/blogMeta";
import { defaultCoverImage, getContentImageUrl } from "@/lib/contentImages";
import { sanitizeHtml } from "@/lib/sanitizeHtml";
import { readJsonFile, writeJsonFile } from "@/lib/github";

export type BlogPost = {
  id: string;
  title: string;
  slug: string;
  excerpt: string;
  author: string;
  category?: string;
  tags?: string[];
  coverImage: string;
  coverImageAlt?: string;
  coverImagePosition?: string;
  contentHtml: string;
  published: boolean;
  createdAt: string;
  updatedAt: string;
};

type BlogPostWithLegacyImage = BlogPost & {
  imageUrl?: string;
  image?: string;
};

export type BlogPostInput = {
  title: string;
  slug?: string;
  excerpt: string;
  author: string;
  category?: string;
  tags?: string[];
  coverImage: string;
  coverImageAlt?: string;
  coverImagePosition?: string;
  contentHtml: string;
  published: boolean;
};

const blogDataPath = "data/blog-posts.json";

function sortPosts(posts: BlogPost[]) {
  return [...posts].sort(
    (a, b) =>
      new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime(),
  );
}

export function slugify(value: string) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/đ/g, "dj")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 80);
}

function uniqueSlug(baseSlug: string, posts: BlogPost[], ignoredId?: string) {
  const base = baseSlug || "blog-post";
  let candidate = base;
  let index = 2;

  while (
    posts.some((post) => post.slug === candidate && post.id !== ignoredId)
  ) {
    candidate = `${base}-${index}`;
    index += 1;
  }

  return candidate;
}

export async function getAllPosts(forceLive = true) {
  const { data } = await readJsonFile<BlogPostWithLegacyImage[]>(
    blogDataPath,
    [],
    forceLive,
  );
  return sortPosts(
    data.map((post) => ({
      ...post,
      coverImage: getContentImageUrl(post),
    })),
  );
}

export async function getPublishedPosts(forceLive = true) {
  const posts = await getAllPosts(forceLive);
  return posts.filter((post) => post.published);
}

export async function getPublishedPostBySlug(slug: string, forceLive = true) {
  const posts = await getPublishedPosts(forceLive);
  return posts.find((post) => post.slug === slug) ?? null;
}

export async function getPostById(id: string, forceLive = false) {
  const posts = await getAllPosts(forceLive);
  return posts.find((post) => post.id === id) ?? null;
}

export async function createPost(input: BlogPostInput) {
  const { data: posts, sha } = await readJsonFile<BlogPost[]>(blogDataPath, [], true);
  const categories = await getBlogCategories(true);
  const now = new Date().toISOString();
  const slug = uniqueSlug(slugify(input.slug || input.title), posts);

  const post: BlogPost = {
    id: crypto.randomUUID(),
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt.trim(),
    author: input.author.trim(),
    category: normalizeCategory(input.category, categories),
    tags: normalizeTags(input.tags),
    coverImage: input.coverImage.trim() || defaultCoverImage,
    coverImageAlt: input.coverImageAlt,
    coverImagePosition: input.coverImagePosition || "center bottom",
    contentHtml: sanitizeHtml(input.contentHtml),
    published: input.published,
    createdAt: now,
    updatedAt: now,
  };

  const updatedPosts = [post, ...posts];
  await writeJsonFile(blogDataPath, updatedPosts, `Create blog post: ${post.title}`, sha);
  return post;
}

export async function updatePost(id: string, input: BlogPostInput) {
  const { data: posts, sha } = await readJsonFile<BlogPost[]>(blogDataPath, [], true);
  const categories = await getBlogCategories(true);
  const existing = posts.find((post) => post.id === id);

  if (!existing) {
    return null;
  }

  const slug = uniqueSlug(slugify(input.slug || input.title), posts, id);
  const categoryOptions = existing.category
    ? [existing.category, ...categories]
    : categories;
  const updatedPost: BlogPost = {
    ...existing,
    title: input.title.trim(),
    slug,
    excerpt: input.excerpt.trim(),
    author: input.author.trim(),
    category: normalizeCategory(input.category, categoryOptions),
    tags: normalizeTags(input.tags),
    coverImage: input.coverImage.trim() || defaultCoverImage,
    coverImageAlt: input.coverImageAlt ?? existing.coverImageAlt,
    coverImagePosition: input.coverImagePosition || "center bottom",
    contentHtml: sanitizeHtml(input.contentHtml),
    published: input.published,
    updatedAt: new Date().toISOString(),
  };

  const updatedPosts = posts.map((post) => (post.id === id ? updatedPost : post));
  await writeJsonFile(blogDataPath, updatedPosts, `Update blog post: ${updatedPost.title}`, sha);
  return updatedPost;
}

export async function deletePost(id: string) {
  const { data: posts, sha } = await readJsonFile<BlogPost[]>(blogDataPath, [], true);
  const deletedPost = posts.find((post) => post.id === id);
  const nextPosts = posts.filter((post) => post.id !== id);

  if (nextPosts.length === posts.length) {
    return false;
  }

  await writeJsonFile(blogDataPath, nextPosts, `Delete blog post: ${deletedPost?.title || id}`, sha);

  if (deletedPost) {
    try {
      await removeUnusedBlogUploads(deletedPost, nextPosts);
    } catch (error) {
      console.warn("Blog post deleted, but uploaded image cleanup failed.", error);
    }
  }

  return true;
}
