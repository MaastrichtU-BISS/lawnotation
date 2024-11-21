<template>
  <div>
    <Header></Header>
    <div id="breadcrumb-holder" class="bg-white dark:bg-gray-800"></div>
  </div>
  <div class="mx-auto max-w-screen-lg py-2 px-4">
    <slot />
    <ReportProblem />
  </div>
</template>