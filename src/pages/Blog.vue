<script setup lang="ts">
import { getAllBlogPosts } from '../utils/blog';
import type { BlogPost } from '../utils/blog';

const posts: BlogPost[] = getAllBlogPosts();

// Format date string (YYYY-MM-DD) to readable format, avoiding timezone issues
const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-');
  const date = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return date.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>

<template>
  <div class="min-h-screen bg-zinc-900 text-white">
    <div class="max-w-4xl mx-auto px-6 md:px-8 py-12 md:py-16">
      <h1 class="text-4xl md:text-5xl font-bold mb-4" style="color: var(--color-brand)">Blog</h1>
      <p class="text-zinc-400 mb-12">Notes on robotics, software, and whatever else I'm working on.</p>

      <div v-if="posts.length === 0" class="text-center">
        <p class="text-zinc-400">No blog posts yet. Check back soon!</p>
      </div>

      <div v-else class="space-y-8">
        <article
          v-for="post in posts"
          :key="post.slug"
          class="border-l-4 border-primary pl-6"
        >
          <router-link
            :to="`/blog/${post.slug}`"
            class="block group"
          >
            <h2 class="text-2xl font-bold mb-2 text-white group-hover:text-brand transition-colors duration-200">
              {{ post.title }}
            </h2>
          </router-link>

          <time class="text-zinc-400 text-sm">
            {{ formatDate(post.date) }}
          </time>

          <p class="text-zinc-300 mt-4 mb-4">
            {{ post.description }}
          </p>

          <router-link
            :to="`/blog/${post.slug}`"
            class="inline-block text-brand hover:text-primary font-semibold transition-colors duration-200"
          >
            Read More →
          </router-link>
        </article>
      </div>
    </div>
  </div>
</template>
