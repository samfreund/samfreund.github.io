# Adding New Blog Posts

This guide explains how to add new blog posts to the site.

## Quick Start

1. Create a new markdown file in this directory (`src/content/blog/`)
2. Use a descriptive slug for the filename (e.g., `my-blog-post.md`)
3. Add YAML frontmatter at the top of the file
4. Write your blog post content in markdown

## Frontmatter

Every post must start with YAML frontmatter delimited by `---` lines. The following fields are used by the site:

| Field         | Required | Description                                            |
| ------------- | -------- | ------------------------------------------------------ |
| `title`       | Yes      | The title of the post, shown in lists and on the page. |
| `date`        | Yes      | Publication date in `YYYY-MM-DD` format. Used to sort. |
| `author`      | Yes      | The author's name.                                     |
| `description` | No       | A short summary shown on the blog listing page.        |

### Example

```markdown
---
title: "My First Post"
date: "2024-01-01"
description: "A short summary of this post."
author: "Sam Freund"
---

Your markdown content goes here.
```

## Notes

- The filename (minus `.md`) becomes the URL slug, e.g. `my-blog-post.md` → `/blog/my-blog-post`.
- Do not name a post `README.md` — it is used for this guide and ignored by the blog.
- Posts are sorted newest first by `date`.
