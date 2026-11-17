import path from "node:path";
import Image from "@11ty/eleventy-img";
import { HtmlBasePlugin } from "@11ty/eleventy";

// Set by the GitHub Pages workflow (e.g. "/joel-dyter/"); empty for the live site.
const PATH_PREFIX = process.env.PATH_PREFIX || "/";

// Image paths in content are written from the site root ("/images/…", "/uploads/…").
// They live under src/ on disk.
function sourcePath(src) {
  return path.join("src", src.replace(/^\/+/, ""));
}

// Published image names stay human readable, e.g.
//   src/images/projects/charcoal-shaker-kitchen/03.jpg → /img/charcoal-shaker-kitchen-03-6LJlLL-800.webp
// The short code changes whenever the photo itself changes, so a replaced
// image is never served from a visitor's browser cache.
function readableName(id, src, width, format) {
  const rel = path.relative("src", src).replace(/\.[^.]+$/, "");
  let parts = rel.split(path.sep).filter((p) => !["images", "projects", "site"].includes(p));
  // robinson-kitchen/robinson-kitchen-01 → robinson-kitchen-01, not robinson-kitchen-robinson-kitchen-01
  if (parts.length > 1 && parts.at(-1).startsWith(parts.at(-2))) parts = parts.slice(0, -2).concat(parts.at(-1));
  const name = parts.join("-").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  return `${name || "image"}-${id.slice(0, 6)}-${width}.${format}`;
}

const imageOptions = {
  widths: [480, 800, 1200, 1800],
  formats: ["webp", "jpeg"],
  outputDir: "_site/img/",
  urlPath: "/img/",
  filenameFormat: readableName,
  sharpJpegOptions: { quality: 80, progressive: true },
  sharpWebpOptions: { quality: 78 },
};

export default function (eleventyConfig) {
  eleventyConfig.addPlugin(HtmlBasePlugin);

  eleventyConfig.addPassthroughCopy("src/assets");
  eleventyConfig.addPassthroughCopy("src/admin");
  eleventyConfig.addPassthroughCopy("src/enquiry.php");
  eleventyConfig.addPassthroughCopy("src/enquiry-config.php");
  eleventyConfig.addPassthroughCopy("src/.htaccess");
  eleventyConfig.addPassthroughCopy({ "src/assets/favicon.svg": "favicon.svg" });

  eleventyConfig.addWatchTarget("src/assets/");
  // The editor is copied as-is, not rendered as a page
  eleventyConfig.ignores.add("src/admin/**");

  // Responsive <picture> for any image in src/images or src/uploads.
  eleventyConfig.addAsyncShortcode("image", async function (src, alt = "", sizes = "100vw", cls = "", loading = "lazy") {
    if (!src) return "";
    const metadata = await Image(sourcePath(src), imageOptions);
    return Image.generateHTML(metadata, {
      alt,
      sizes,
      loading,
      decoding: "async",
      ...(cls ? { class: cls } : {}),
      ...(loading === "eager" ? { fetchpriority: "high" } : {}),
    });
  });

  // URL of the largest JPEG rendition (lightbox, social sharing previews).
  eleventyConfig.addAsyncShortcode("imageUrl", async function (src, width = 1800) {
    if (!src) return "";
    const metadata = await Image(sourcePath(src), imageOptions);
    const jpegs = metadata.jpeg;
    const pick = jpegs.filter((j) => j.width <= width).pop() || jpegs[0];
    return pick.url;
  });

  eleventyConfig.addCollection("projects", (api) =>
    api.getFilteredByGlob("./src/projects/*.md").sort((a, b) => b.date - a.date)
  );

  eleventyConfig.addFilter("byCategory", (items, category) =>
    (items || []).filter((p) => p.data.category === category)
  );
  eleventyConfig.addFilter("bySlug", (items, slugs) => {
    const wanted = [].concat(slugs || []);
    return (items || []).filter((p) => wanted.includes(p.fileSlug));
  });
  eleventyConfig.addFilter("exceptUrl", (items, url) => (items || []).filter((p) => p.url !== url));
  eleventyConfig.addFilter("categories", (items) => [...new Set((items || []).map((p) => p.data.category))]);
  eleventyConfig.addFilter("featured", (items) => (items || []).filter((p) => p.data.featured));
  eleventyConfig.addFilter("limit", (items, n) => (items || []).slice(0, n));
  eleventyConfig.addFilter("isoDate", (d) => new Date(d).toISOString().slice(0, 10));
  eleventyConfig.addFilter("year", () => new Date().getFullYear());
  eleventyConfig.addFilter("gbp", (n) => "£" + Number(n).toLocaleString("en-GB"));
  eleventyConfig.addFilter("telHref", (n) => "tel:+44" + String(n).replace(/\D/g, "").replace(/^0/, ""));
  eleventyConfig.addFilter("whatsappHref", (n, text = "") => {
    const num = "44" + String(n).replace(/\D/g, "").replace(/^0/, "");
    return `https://wa.me/${num}${text ? "?text=" + encodeURIComponent(text) : ""}`;
  });
  eleventyConfig.addFilter("absoluteUrl", (url, base) => new URL(url, base).href);
  eleventyConfig.addFilter("stageCount", (stages) => (stages || []).length);
  eleventyConfig.addFilter("json", (v) => JSON.stringify(v));

  return {
    dir: { input: "src", output: "_site", includes: "_includes", data: "_data" },
    pathPrefix: PATH_PREFIX,
    markdownTemplateEngine: "njk",
    htmlTemplateEngine: "njk",
  };
}
