import type { RouteRecordRaw } from 'vue-router';

import Home from './pages/Home.vue';
import Blog from './pages/Blog.vue';
import BlogPost from './pages/BlogPost.vue';
import NotFound from './pages/NotFound.vue';

export const routes: RouteRecordRaw[] = [
  {
    path: '/',
    name: 'Home',
    component: Home,
  },
  {
    path: '/blog',
    name: 'Blog',
    component: Blog,
  },
  {
    path: '/blog/:slug',
    name: 'BlogPost',
    component: BlogPost,
  },
  {
    path: '/:pathMatch(.*)*',
    name: 'NotFound',
    component: NotFound,
  },
];
