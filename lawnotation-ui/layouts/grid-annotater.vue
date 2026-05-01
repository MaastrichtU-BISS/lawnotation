<template>
  <div class="h-dynamic-screen grid grid-rows-[min-content_min-content_1fr]">
    <Header></Header>
    <slot />
  </div>
</template>

<style lang="postcss" scoped>
.h-dynamic-screen {
  height: 100vh;
  height: 93dvh;
}
</style>
