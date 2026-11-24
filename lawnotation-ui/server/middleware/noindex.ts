// With NUXT_NOINDEX=true (test and staging deployments) every response asks
// search engines not to index or follow it. See also server/routes/robots.txt.ts.
export default defineEventHandler((event) => {
  if (useRuntimeConfig().noindex) setHeader(event, "X-Robots-Tag", "noindex, nofollow");
});
