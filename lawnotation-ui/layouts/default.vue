<template>
  <div>
    <Header></Header>
    <div class="bg-white dark:bg-gray-800">
      <Breadcrumb />
    </div>
  </div>
  <div class="mx-auto max-w-screen-lg py-2">
    <slot />
  </div>
</template>
<script setup lang="ts"></script>
