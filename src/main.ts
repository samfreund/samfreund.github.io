import { ViteSSG } from 'vite-ssg';
import type { RouteRecordRaw } from 'vue-router';
import App from './App.vue';
import { routes } from './router';
import { getAllBlogPosts } from './utils/blog';
import './css/main.css';

export const createApp = ViteSSG(App, { routes });

export async function includedRoutes(
  _paths: string[],
  routes: Readonly<RouteRecordRaw[]>,
): Promise<string[]> {
  const slugs = getAllBlogPosts().map((post) => `/blog/${post.slug}`);
  return routes.flatMap((route) => {
    if (route.name === 'BlogPost') return slugs;
    if (route.name === 'NotFound') return [];
    return route.path;
  });
}
