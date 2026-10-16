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

const imageOptions = {
  widths: [480, 800, 1200, 1800],
  formats: ["webp", "jpeg"],
  outputDir: "_site/img/",
  urlPath: "/img/",
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
