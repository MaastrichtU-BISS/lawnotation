<template>
  <div>
    <div class="sticky top-0 w-full z-50">
      <Header></Header>
      <div id="breadcrumb-holder" class="bg-white dark:bg-gray-800"></div>
    </div>
    <div class="mx-auto py-4 px-4">
      <slot />
    </div>
  </div>
</template>
<script setup lang="ts"></script>
