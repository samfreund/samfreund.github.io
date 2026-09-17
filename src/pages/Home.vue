<script setup lang="ts">
import Button from "../components/Button.vue";
import GridSection from "../components/GridSection.vue";

const skills = [
  {
    icon: "fa-solid fa-brain",
    title: "Machine Learning & AI",
    description:
      "Computer vision with YOLO and TensorFlow, deep learning, and real-time model deployment on embedded systems.",
  },
  {
    icon: "fa-solid fa-microchip",
    title: "Embedded Systems",
    description:
      "Real-time systems, robotics control theory, and JNI integration with custom machine learning systems.",
  },
  {
    icon: "fa-solid fa-code",
    title: "Software Development",
    description:
      "Proficient in Java, Python, C/C++, TypeScript, and Vue. Experience with full-stack development and API design.",
  },
  {
    icon: "fa-solid fa-robot",
    title: "Robotics & Control Systems",
    description:
      "Controls lead for NASA Lunabotics team. Expertise in robotics systems, control theory, and competition-level development.",
  },
  {
    icon: "fa-solid fa-linux",
    title: "Systems & DevOps",
    description:
      "Linux system administration, Docker containerization, CI/CD pipelines, and Git-based collaboration workflows.",
  },
  {
    icon: "fa-solid fa-code-branch",
    title: "Open Source Leadership",
    description:
      "Developer and maintainer for PhotonVision. Code review, documentation, community management, and project governance.",
  },
];

const projects = [
  {
    icon: "fa-solid fa-camera",
    title: "PhotonVision",
    description:
      "As a developer and maintainer of this open-source computer vision platform, I contribute to a project that empowers over 1,000 FIRST Robotics Competition teams worldwide. My work includes a complete overhaul of the object detection pipeline, adding support for the Rubik Pi 3, standardizing the web API for consistency, and publishing real-time metrics through NetworkTables. I also helped establish code review processes and enhanced CI/CD pipelines to improve security and code quality.",
  },
  {
    icon: "fa-solid fa-rocket",
    title: "NASA Lunabotics Robot",
    description:
      "Leading the controls team for MSOE's entry in the NASA Lunabotics competition, where we're developing an autonomous excavation robot designed to operate in simulated lunar conditions. I'm responsible for architecting and implementing the control systems, with a focus on achieving real-time performance and reliable operation in challenging environments.",
  },
];

const socialLinks = [
  {
    href: "https://github.com/samfreund/",
    icon: "fab fa-github",
    label: "GitHub",
  },
  {
    href: "https://www.linkedin.com/in/samuel-freund/",
    icon: "fab fa-linkedin-in",
    label: "LinkedIn",
  },
  {
    href: "mailto:samf.236@proton.me",
    icon: "fa-solid fa-envelope",
    label: "Email",
  },
];
</script>

<template>
  <main>
    <section
      id="about"
      class="flex flex-col min-h-[calc(100vh_-_56px)] md:justify-center items-center p-8 md:p-16 relative overflow-hidden"
    >
      <div
        class="flex justify-center md:justify-start flex-col md:flex-row items-center gap-8"
      >
        <span class="self-center md:self-initial shrink">
          <img
            src="/images/headshot.jpg"
            alt="Sam Freund"
            class="max-w-48 md:max-w-80 rounded-full drop-shadow-2xl transition-transform duration-500 hover:scale-105"
          />
        </span>
        <header
          class="flex flex-col gap-6 items-center md:items-start justify-center text-center md:text-start"
        >
          <h1
            class="text-5xl md:text-6xl font-bold drop-shadow-lg font-heading"
          >
            Hi, I'm <span class="text-brand">Sam Freund</span>
          </h1>
          <div
            class="text-xl md:text-2xl max-w-128 text-zinc-300 leading-relaxed px-4 md:px-8"
          >
            I'm an undergraduate computer science student at MSOE with a
            background in real-world application and iterative development. I'm
            currently serving as the Controls Lead for the NASA Lunabotics team
            at MSOE and a developer and maintainer for PhotonVision, an
            open-source computer vision platform used by over 1000 robotics
            teams.
          </div>
          <div class="flex gap-4 self-center md:self-start">
            <Button
              href="#projects"
              variant="primary"
              size="lg"
              class="rounded-xl"
            >
              View My Work
            </Button>
            <Button
              href="#contact"
              variant="outline"
              size="lg"
              class="rounded-xl"
            >
              Get in Touch
            </Button>
          </div>
        </header>
      </div>
      <a
        href="#skills"
        class="absolute bottom-8 p-4 text-brand/70 hover:text-brand hover:translate-y-1 transition-all duration-300 animate-bounce"
      >
        <i class="fa-solid fa-chevron-down text-2xl"></i>
      </a>
    </section>

    <GridSection
      id="skills"
      description="I specialize in full-stack development with expertise across modern technologies and frameworks. Here are some of the areas where I excel."
      :features="skills"
      :columns="2"
      show-scroll-indicator
      scroll-target="#projects"
    >
      <template #title>
        Skills & <span class="text-brand">Expertise</span>
      </template>
    </GridSection>

    <GridSection
      id="projects"
      description="Here are some of my recent projects that showcase my skills and experience. Each project represents a unique challenge and learning opportunity."
      :features="projects"
      :columns="2"
      reverse-cards
    >
      <template #title>
        Featured <span class="text-brand">Projects</span>
      </template>
    </GridSection>

    <section
      id="contact"
      class="py-20 px-8 bg-zinc-900 border-t border-zinc-700"
    >
      <div class="max-w-4xl mx-auto text-center">
        <h2 class="text-4xl font-bold mb-6 font-heading">
          Get in <span class="text-brand">Touch</span>
        </h2>
        <p class="text-xl text-zinc-300 mb-8 max-w-2xl mx-auto">
          I'm always interested in new opportunities and collaborations. Feel
          free to reach out!
        </p>
        <div
          class="flex flex-col md:flex-row justify-center gap-4 md:gap-6 mb-8"
        >
          <a
            v-for="link in socialLinks"
            :key="link.href"
            :href="link.href"
            class="flex items-center justify-center gap-2 px-6 py-3 bg-zinc-800 hover:bg-zinc-700 rounded-lg transition-colors"
          >
            <i :class="[link.icon, 'text-xl']"></i>
            <span>{{ link.label }}</span>
          </a>
        </div>
      </div>
    </section>
  </main>
</template>
