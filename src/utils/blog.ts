export interface BlogMetadata {
  title: string;
  date: string;
  description: string;
  author: string;
}

export interface BlogPost extends BlogMetadata {
  slug: string;
}

/**
 * Parse YAML frontmatter from markdown content
 */
export function parseFrontmatter(content: string): {
  metadata: BlogMetadata;
  body: string;
} {
  const frontmatterRegex = /^---\n([\s\S]*?)\n---\n([\s\S]*)$/;
  const match = content.match(frontmatterRegex);

  if (!match) {
    throw new Error('Invalid markdown format: missing frontmatter');
  }

  const [, frontmatterStr, body] = match;
  const metadata: BlogMetadata = {
    title: '',
    date: '',
    description: '',
    author: '',
  };

  // Simple YAML parser for our specific fields
  const lines = frontmatterStr.split('\n');
  for (const line of lines) {
    if (!line.trim()) continue; // Skip empty lines

    const colonIndex = line.indexOf(':');
    if (colonIndex === -1) continue; // Skip lines without colons

    const key = line.substring(0, colonIndex).trim();
    const value = line
      .substring(colonIndex + 1)
      .trim()
      .replace(/^["']|["']$/g, '');

    if (key === 'title') {
      metadata.title = value;
    } else if (key === 'date') {
      metadata.date = value;
    } else if (key === 'description') {
      metadata.description = value;
    } else if (key === 'author') {
      metadata.author = value;
    }
  }

  return { metadata, body };
}

// Eagerly import all blog markdown files as raw strings at build time, so
// posts are available synchronously during both SSR and client rendering.
const blogModules = import.meta.glob<string>('../content/blog/*.md', {
  eager: true,
  query: '?raw',
  import: 'default',
});

/**
 * Get all blog posts, sorted by date descending (newest first)
 */
export function getAllBlogPosts(): BlogPost[] {
  const posts: BlogPost[] = [];

  for (const [path, content] of Object.entries(blogModules)) {
    // Extract slug from path like "../content/blog/welcome-to-ndof.md"
    const slug = path.split('/').pop()?.replace('.md', '');
    if (!slug) continue;
    if (slug === 'README') continue;

    try {
      const { metadata } = parseFrontmatter(content);
      posts.push({
        ...metadata,
        slug,
      });
    } catch (error) {
      console.error(`Error parsing blog post ${slug}:`, error);
    }
  }

  posts.sort(
    (a, b) => new Date(b.date).getTime() - new Date(a.date).getTime(),
  );

  return posts;
}

/**
 * Get a single blog post by slug, or null if it does not exist
 */
export function getBlogPost(slug: string): (BlogPost & { body: string }) | null {
  const modulePath = Object.keys(blogModules).find((path) =>
    path.includes(`/${slug}.md`),
  );

  if (!modulePath) {
    console.error(`Blog post not found: ${slug}`);
    return null;
  }

  try {
    const content = blogModules[modulePath];
    const { metadata, body } = parseFrontmatter(content);
    return {
      ...metadata,
      slug,
      body,
    };
  } catch (error) {
    console.error(`Error loading blog post ${slug}:`, error);
    return null;
  }
}
