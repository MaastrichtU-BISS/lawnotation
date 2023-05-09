<script setup lang="ts">
import Header from "@/components/Header.vue";
import Footer from "@/components/Footer.vue";
</script>
<template>
  <div>
    <Header></Header>
    <div class="mx-auto max-w-screen-lg py-4">
      <slot />
    </div>
    <Footer></Footer>
  </div>
</template>
