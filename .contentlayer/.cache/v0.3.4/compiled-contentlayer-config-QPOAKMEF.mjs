// contentlayer.config.ts
import { defineDocumentType, makeSource } from "contentlayer/source-files";

// assets/siteMetadata.ts
var siteMetadata = {
  title: `acn1's blog`,
  author: "zS1m",
  headerTitle: "acn1",
  description: "Junior @ East Brunswick High School, Interested in Cybersecurity.",
  language: "en",
  buildTime: "2023-08-01 10:14:12",
  theme: "dark",
  // system, dark or light
  siteUrl: "https://www.contrails.space",
  siteRepo: "https://github.com/zS1m/nextjs-contrails",
  siteLogo: "/static/images/logo.png",
  email: "themightyhisez@gmail.com",
  github: "https://github.com/imAcni",
  linkedin: "https://www.linkedin.com/in/tyler-chin-91b22a25b?trk=people-guest_people_search-card",
  locale: "en",
  analytics: {
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // supports Plausible, Simple Analytics, Umami, Posthog or Google Analytics.
    umamiAnalytics: {
      // We use an env variable for this site to avoid other users cloning our analytics ID
      umamiWebsiteId: process.env.NEXT_UMAMI_ID
      // e.g. 123e4567-e89b-12d3-a456-426614174000
    },
    baiduAnalytics: {
      baiduAnalyticsId: process.env.BAIDU_ANALYTICS_ID
    }
    // plausibleAnalytics: {
    //   plausibleDataDomain: '', // e.g. tailwind-nextjs-starter-blog.vercel.app
    // },
    // simpleAnalytics: {},
    // posthogAnalytics: {
    //   posthogProjectApiKey: '', // e.g. 123e4567-e89b-12d3-a456-426614174000
    // },
    // googleAnalytics: {
    //   googleAnalyticsId: '', // e.g. G-XXXXXXX
    // },
  },
  newsletter: {
    // supports mailchimp, buttondown, convertkit, klaviyo, revue, emailoctopus
    // Please add your .env file and modify it according to your selection
    provider: "buttondown"
  },
  comments: {
    // If you want to use an analytics provider you have to add it to the
    // content security policy in the `next.config.js` file.
    // Select a provider and use the environment variables associated to it
    // https://vercel.com/docs/environment-variables
    provider: "giscus",
    // supported providers: giscus, utterances, disqus
    giscusConfig: {
      // Visit the link below, and follow the steps in the 'configuration' section
      // https://giscus.app/
      repo: process.env.NEXT_PUBLIC_GISCUS_REPO,
      repositoryId: process.env.NEXT_PUBLIC_GISCUS_REPOSITORY_ID,
      category: process.env.NEXT_PUBLIC_GISCUS_CATEGORY,
      categoryId: process.env.NEXT_PUBLIC_GISCUS_CATEGORY_ID,
      mapping: "pathname",
      // supported options: pathname, url, title
      reactions: "1",
      // Emoji reactions: 1 = enable / 0 = disable
      // Send discussion metadata periodically to the parent window: 1 = enable / 0 = disable
      metadata: "0",
      // theme example: light, dark, dark_dimmed, dark_high_contrast
      // transparent_dark, preferred_color_scheme, custom
      theme: "dark",
      // theme when dark mode
      darkTheme: "transparent_dark",
      // If the theme option above is set to 'custom`
      // please provide a link below to your custom theme css file.
      // example: https://giscus.app/themes/custom_example.css
      themeURL: "",
      // This corresponds to the `data-lang="en"` in giscus's configurations
      lang: "en"
    }
  },
  search: {
    provider: "kbar",
    // kbar or algolia
    kbarConfig: {
      searchDocumentsPath: "search.json"
      // path to load documents to search
    }
    // provider: 'algolia',
    // algoliaConfig: {
    //   // The application ID provided by Algolia
    //   appId: 'R2IYF7ETH7',
    //   // Public API key: it is safe to commit it
    //   apiKey: '599cec31baffa4868cae4e79f180729b',
    //   indexName: 'docsearch',
    // },
  }
};
var siteMetadata_default = siteMetadata;

// contentlayer.config.ts
import rehypePrismPlus from "rehype-prism-plus";
import { remarkCodeTitles, remarkExtractFrontmatter, remarkImgToJsx } from "pliny/mdx-plugins/index.js";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypePresetMinify from "rehype-preset-minify";
import rehypeKatex from "rehype-katex";

// lib/utils.ts
function countWords(str) {
  const chWords = Array.from(str).filter((char) => /[\u4e00-\u9fa5]/.test(char)).length;
  const enWords = Array.from(str).map((char) => /[a-zA-Z0-9\s]/.test(char) ? char : " ").join("").split(/\s+/).filter((s) => s).length;
  const words = chWords + enWords;
  const minutes = Math.round(words / 300);
  const text = minutes < 1 ? "\u5C0F\u4E8E\u4E00\u5206\u949F" : `${minutes} \u5206\u949F`;
  return {
    words,
    minutes,
    text
  };
}

// contentlayer.config.ts
var computedFields = {
  readingTime: { type: "json", resolve: (doc) => countWords(doc.body.raw) },
  slug: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath.replace(/^.+?(\/)/, "")
  },
  path: {
    type: "string",
    resolve: (doc) => doc._raw.flattenedPath
  },
  filePath: {
    type: "string",
    resolve: (doc) => doc._raw.sourceFilePath
  }
};
var Post = defineDocumentType(() => ({
  name: "Post",
  filePathPattern: `posts/**/*.mdx`,
  contentType: "mdx",
  fields: {
    title: { type: "string", required: true },
    date: { type: "date", required: true },
    url: { type: "string", required: true },
    tags: { type: "list", of: { type: "string" }, default: [] },
    lastmod: { type: "date" },
    draft: { type: "boolean" },
    summary: { type: "string" },
    images: { type: "json" },
    authors: { type: "list", of: { type: "string" } },
    layout: { type: "string" },
    bibliography: { type: "string" },
    canonicalUrl: { type: "string" }
  },
  computedFields: {
    ...computedFields,
    structuredData: {
      type: "json",
      resolve: (doc) => ({
        "@context": "https://schema.org",
        "@type": "BlogPosting",
        headline: doc.title,
        datePublished: doc.date,
        dateModified: doc.lastmod || doc.date,
        description: doc.summary,
        image: doc.images ? doc.images[0] : siteMetadata_default.socialBanner,
        url: `${siteMetadata_default.siteUrl}/${doc._raw.flattenedPath}`
      })
    }
  }
}));
var Author = defineDocumentType(() => ({
  name: "Author",
  filePathPattern: "authors/**/*.mdx",
  contentType: "mdx",
  fields: {
    name: { type: "string", required: true },
    avatar: { type: "string" },
    occupation: { type: "string" },
    company: { type: "string" },
    email: { type: "string" },
    twitter: { type: "string" },
    linkedin: { type: "string" },
    github: { type: "string" },
    layout: { type: "string" }
  },
  computedFields
}));
var contentlayer_config_default = makeSource({
  contentDirPath: ".",
  contentDirInclude: ["posts", "authors"],
  documentTypes: [Post, Author],
  mdx: {
    remarkPlugins: [
      remarkExtractFrontmatter,
      remarkGfm,
      remarkCodeTitles,
      remarkMath,
      remarkImgToJsx
    ],
    rehypePlugins: [
      rehypeSlug,
      rehypeAutolinkHeadings,
      rehypeKatex,
      [rehypePrismPlus, { defaultLanguage: "js", ignoreMissing: true, showLineNumbers: true }],
      rehypePresetMinify
    ]
  }
});
export {
  Author,
  Post,
  contentlayer_config_default as default
};
//# sourceMappingURL=compiled-contentlayer-config-QPOAKMEF.mjs.map
