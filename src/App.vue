<script setup lang="ts">
import { watch } from "vue";
import { useRoute } from "vue-router";

const sectionLinks = [
  {
    href: "/#about",
    label: "About",
    icon: "fa-solid fa-user",
  },
  {
    href: "/#skills",
    label: "Skills",
    icon: "fa-solid fa-code",
  },
  {
    href: "/#projects",
    label: "Projects",
    icon: "fa-solid fa-folder-open",
  },
  {
    href: "/#contact",
    label: "Contact",
    icon: "fa-solid fa-envelope",
  },
];

const blogLink = {
  to: "/blog",
  label: "Blog",
  icon: "fa-solid fa-newspaper",
};

const route = useRoute();

watch(
  () => route.path,
  () => {
    document.getElementById("page-wrapper")?.scrollTo(0, 0);
  },
);
</script>

<template>
  <div id="page-wrapper" class="h-screen overflow-y-auto scroll-smooth">
    <header
      id="header"
      class="bg-zinc-900/80 backdrop-blur-md flex items-center justify-between sticky top-0 w-full z-50 border-b border-zinc-700/50 px-4 md:px-8"
    >
      <router-link to="/" class="flex items-center gap-3 py-2 group">
        <img
          src="/favicon.svg"
          alt="Sam Freund"
          class="w-10 h-10 rounded-full group-hover:scale-110 transition-transform duration-300"
        />
        <span class="font-bold text-xl hidden sm:block text-white">
          Sam Freund
        </span>
      </router-link>
      <div>
        <!-- Mobile menu button -->
        <button
          class="p-3 hover:bg-zinc-700/50 rounded-lg cursor-pointer flex md:!hidden transition-colors anchor/my-anchor"
          popovertarget="mobile-nav"
          aria-label="Open mobile navigation menu"
        >
          <i class="fa-solid fa-bars text-xl"></i>
        </button>

        <div class="relative">
          <div
            popover
            id="mobile-nav"
            class="bg-zinc-900/95 backdrop-blur-lg transition-opacity starting:open:opacity-0 open:opacity-100 opacity-0 duration-300 transition-discrete open:flex open:flex-col md:open:hidden items-center justify-center gap-2 anchored/my-anchor anchored-bottom-span-left overflow-clip p-2 rounded-b-2xl"
          >
            <a
              v-for="link in sectionLinks"
              :key="link.href"
              :href="link.href"
              class="flex items-center gap-3 px-6 py-4 text-xl text-white hover:text-brand transition-colors"
            >
              <i :class="link.icon"></i>
              {{ link.label }}
            </a>
            <router-link
              :to="blogLink.to"
              class="flex items-center gap-3 px-6 py-4 text-xl text-white hover:text-brand transition-colors"
            >
              <i :class="blogLink.icon"></i>
              {{ blogLink.label }}
            </router-link>
          </div>
        </div>
      </div>

      <!-- Desktop nav -->
      <nav id="nav" class="hidden md:flex items-center gap-1">
        <a
          v-for="link in sectionLinks"
          :key="link.href"
          :href="link.href"
          class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700/50 hover:text-brand transition-all duration-200"
        >
          <i :class="[link.icon, 'text-sm opacity-70']"></i>
          {{ link.label }}
        </a>
        <router-link
          :to="blogLink.to"
          class="flex items-center gap-2 px-4 py-2 rounded-lg hover:bg-zinc-700/50 hover:text-brand transition-all duration-200"
        >
          <i :class="[blogLink.icon, 'text-sm opacity-70']"></i>
          {{ blogLink.label }}
        </router-link>
      </nav>
    </header>

    <router-view />

    <footer id="footer" class="py-8 px-8 bg-zinc-800">
      <div
        class="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4"
      >
        <div class="flex items-center gap-4">
          <img
            src="/favicon.svg"
            class="w-10 h-10 rounded-full hover:scale-110 transition-transform duration-300"
            alt="Sam Freund"
          />
          <span class="font-semibold text-lg">Sam Freund</span>
        </div>
        <p class="text-sm text-zinc-400">
          &copy;{{ new Date().getFullYear() }} Sam Freund. All rights reserved.
        </p>
      </div>
    </footer>
  </div>
</template>
