export default defineEventHandler((event) => {
  setHeader(event, "content-type", "text/plain; charset=utf-8");
  return useRuntimeConfig().noindex
    ? "User-agent: *\nDisallow: /\n"
    : "User-agent: *\nAllow: /\n";
});
