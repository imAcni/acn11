import fs from "node:fs";
import path from "node:path";
import { defineConfig, envField, fontProviders } from "astro/config";
import tailwindcss from "@tailwindcss/vite";
import sitemap from "@astrojs/sitemap";
import remarkToc from "remark-toc";
import remarkCollapse from "remark-collapse";
import {
  transformerNotationDiff,
  transformerNotationHighlight,
  transformerNotationWordHighlight,
} from "@shikijs/transformers";
import { transformerFileName } from "./src/utils/transformers/fileName";
import { SITE } from "./src/config";
import { slugifyStr } from "./src/utils/slugify";

const BLOG_PATH = path.join(process.cwd(), "src/data/blog");

const normalizePath = (value: string) =>
  value.endsWith("/") && value !== "/" ? value.slice(0, -1) : value;

const getPagePath = (page: string) => {
  if (page.startsWith("http://") || page.startsWith("https://")) {
    try {
      return normalizePath(new URL(page).pathname);
    } catch {
      return normalizePath(page);
    }
  }

  return normalizePath(page);
};

const getUnlistedPaths = () => {
  const unlisted = new Set<string>();

  try {
    const stack = [BLOG_PATH];

    while (stack.length > 0) {
      const current = stack.pop();
      if (!current) continue;

      const entries = fs.readdirSync(current, { withFileTypes: true });
      for (const entry of entries) {
        const fullPath = path.join(current, entry.name);

        if (entry.isDirectory()) {
          stack.push(fullPath);
          continue;
        }

        if (!entry.isFile()) continue;
        if (!entry.name.endsWith(".md")) continue;
        if (entry.name.startsWith("_")) continue;

        const contents = fs.readFileSync(fullPath, "utf8");
        const frontmatterMatch = contents.match(/^---\s*([\s\S]*?)\s*---/);
        if (!frontmatterMatch) continue;

        if (!/^\s*unlisted:\s*true\s*$/m.test(frontmatterMatch[1])) continue;

        const relative = path
          .relative(BLOG_PATH, fullPath)
          .replace(/\\/g, "/");
        const segments = relative.split("/");
        const fileName = segments.pop() ?? "";
        const slug = fileName.replace(/\.md$/, "");

        const dirSegments = segments
          .filter(segment => segment && !segment.startsWith("_"))
          .map(slugifyStr);

        const urlPath = normalizePath(
          ["/posts", ...dirSegments, slug].join("/")
        );

        unlisted.add(urlPath);
      }
    }
  } catch {
    return unlisted;
  }

  return unlisted;
};

const unlistedPaths = getUnlistedPaths();

// https://astro.build/config
export default defineConfig({
  site: SITE.website,
  integrations: [
    sitemap({
      filter: page => {
        const pagePath = getPagePath(page);
        if (!SITE.showArchives && pagePath.endsWith("/archives")) return false;
        if (unlistedPaths.has(pagePath)) return false;
        return true;
      },
    }),
  ],
  markdown: {
    remarkPlugins: [remarkToc, [remarkCollapse, { test: "Table of contents" }]],
    shikiConfig: {
      // For more themes, visit https://shiki.style/themes
      themes: { light: "min-light", dark: "night-owl" },
      defaultColor: false,
      wrap: false,
      transformers: [
        transformerFileName({ style: "v2", hideDot: false }),
        transformerNotationHighlight(),
        transformerNotationWordHighlight(),
        transformerNotationDiff({ matchAlgorithm: "v3" }),
      ],
    },
  },
  vite: {
    // eslint-disable-next-line
    // @ts-ignore
    // This will be fixed in Astro 6 with Vite 7 support
    // See: https://github.com/withastro/astro/issues/14030
    plugins: [tailwindcss()],
    optimizeDeps: {
      exclude: ["@resvg/resvg-js"],
    },
  },
  image: {
    responsiveStyles: true,
    layout: "constrained",
  },
  env: {
    schema: {
      PUBLIC_GOOGLE_SITE_VERIFICATION: envField.string({
        access: "public",
        context: "client",
        optional: true,
      }),
    },
  },
  experimental: {
    preserveScriptOrder: true,
    fonts: [
      {
        name: "Google Sans Code",
        cssVariable: "--font-google-sans-code",
        provider: fontProviders.google(),
        fallbacks: ["monospace"],
        weights: [300, 400, 500, 600, 700],
        styles: ["normal", "italic"],
      },
    ],
  },
});
