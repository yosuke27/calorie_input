<template>
  <div class="h-full">
    <VitePwaManifest />
    <NuxtPage />
  </div>
</template>

<style>
html, body {
  margin: 0;
  padding: 0;
  overflow: hidden;
  height: 100%;
  overscroll-behavior-y: none; /* Pull-to-refreshや意図しないスクロールを防止 */
}

#__nuxt {
  height: 100%;
}
</style>