<template>
  <div class="h-dynamic-screen grid grid-rows-[min-content_min-content_1fr]">
    <Header></Header>
    <div id="breadcrumb-holder" class="bg-white dark:bg-gray-800 border-b"></div>
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.h-dynamic-screen {
  height: 100vh;
  height: 94dvh;
}
</style>
