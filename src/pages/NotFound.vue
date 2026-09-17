<template>
  <section class="min-h-screen bg-zinc-900 text-white">
    <div class="mx-auto max-w-3xl px-6 py-20 text-center">
      <p class="text-sm uppercase tracking-[0.2em] text-zinc-400">404</p>
      <h1 class="mt-4 text-4xl md:text-5xl font-bold">Page not found</h1>
      <p class="mt-5 text-zinc-300">
        The page you are looking for does not exist or may have moved.
      </p>
      <router-link
        to="/"
        class="mt-8 inline-flex items-center rounded-md px-5 py-3 font-semibold text-zinc-950"
        style="background-color: var(--color-brand)"
      >
        Return Home
      </router-link>
    </div>
  </section>
</template>
