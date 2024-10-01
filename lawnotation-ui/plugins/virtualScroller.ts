import VueVirtualScroller from 'vue-virtual-scroller';
import 'vue-virtual-scroller/dist/vue-virtual-scroller.css';
export default defineNuxtPlugin((nuxtApp) => {
  nuxtApp.vueApp.use(VueVirtualScroller);
  nuxtApp.vueApp.component('DynamicScroller', VueVirtualScroller.DynamicScroller);
  nuxtApp.vueApp.component('DynamicScrollerItem', VueVirtualScroller.DynamicScrollerItem);
});
