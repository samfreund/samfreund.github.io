<script setup lang="ts">
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import { Marked } from 'marked';
import { markedHighlight } from 'marked-highlight';
import hljs from 'highlight.js/lib/common';
import { getBlogPost } from '../utils/blog';
import 'highlight.js/styles/github-dark.css';
import '../css/markdown.css';

const marked = new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
      const language = hljs.getLanguage(lang) ? lang : 'plaintext';
      return hljs.highlight(code, { language }).value;
    },
  }),
);

function withCopyButtons(html: string): string {
  return html.replace(
    /<pre>([\s\S]*?)<\/pre>/g,
    (match, inner: string) =>
      `<div class="code-block"><button class="copy-btn" type="button" aria-label="Copy code to clipboard"><i class="fa-solid fa-copy" aria-hidden="true"></i></button><pre>${inner}</pre></div>`,
  );
}

async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const textarea = document.createElement('textarea');
    textarea.value = text;
    textarea.style.position = 'fixed';
    textarea.style.opacity = '0';
    document.body.appendChild(textarea);
    textarea.select();
    document.execCommand('copy');
    document.body.removeChild(textarea);
  }
}

function setIcon(btn: HTMLButtonElement, icon: string): void {
  const iconEl = btn.querySelector('i');
  if (iconEl) {
    iconEl.className = `fa-solid ${icon}`;
  }
}

const contentRef = ref<HTMLElement | null>(null);

onMounted(() => {
  contentRef.value?.addEventListener('click', (event) => {
    const target = event.target as HTMLElement;
    const btn = target.closest<HTMLButtonElement>('.copy-btn');
    if (!btn) return;

    const code = btn.closest('.code-block')?.querySelector('code');
    const text = code?.textContent ?? '';

    copyText(text).then(() => {
      setIcon(btn, 'fa-check');
    }).catch(() => {
      setIcon(btn, 'fa-xmark');
    });

    setTimeout(() => {
      setIcon(btn, 'fa-copy');
    }, 2000);
  });
});

const route = useRoute();
const slug = route.params.slug as string;

const post = getBlogPost(slug);
const error = post === null;
const title = post?.title ?? '';
const date = post?.date ?? '';
const htmlContent = post ? withCopyButtons(marked.parse(post.body)) : '';

// Format date string (YYYY-MM-DD) to readable format, avoiding timezone issues
const formatDate = (dateString: string): string => {
  const [year, month, day] = dateString.split('-');
  const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day));
  return dateObj.toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
  });
};
</script>

<template>
  <div class="min-h-screen bg-zinc-900 text-white">
    <div class="max-w-4xl mx-auto px-6 md:px-8 py-12 md:py-16">
      <router-link to="/blog" class="text-brand hover:text-primary mb-8">
        ← Back to Blog
      </router-link>

      <div v-if="error" class="text-center">
        <p class="text-red-400">Error loading blog post.</p>
      </div>

      <article v-else>
        <header class="mb-8">
          <h1 class="text-4xl font-bold mb-4" style="color: var(--color-brand)">{{ title }}</h1>
          <time class="text-zinc-400">{{ formatDate(date) }}</time>
        </header>

        <div class="markdown-content" ref="contentRef" v-html="htmlContent"></div>
      </article>
    </div>
  </div>
</template>
