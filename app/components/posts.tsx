import Link from 'next/link'
import { formatDate, getBlogPosts } from 'app/blog/utils'

export function BlogPosts({
  abbreviatedDates = false,
  showCategories = false,
}: {
  abbreviatedDates?: boolean
  showCategories?: boolean
} = {}) {
  let allBlogs = getBlogPosts()

  return (
    <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
      {allBlogs
        .sort((a, b) => {
          if (
            new Date(a.metadata.publishedAt) > new Date(b.metadata.publishedAt)
          ) {
            return -1
          }
          return 1
        })
        .map((post) => (
          <Link
            key={post.slug}
            className="group flex flex-col space-y-1 py-3 first:pt-0 focus-visible:rounded-sm focus-visible:outline-2 focus-visible:outline-blue-500 focus-visible:outline-offset-2"
            href={`/blog/${post.slug}`}
          >
            <div className="w-full flex flex-col md:flex-row space-x-0 md:space-x-2">
              <p className={`${abbreviatedDates ? 'w-32' : 'w-40'} shrink-0 whitespace-nowrap tabular-nums text-neutral-600 dark:text-neutral-400`}>
                {abbreviatedDates
                  ? formatDate(post.metadata.publishedAt, false, 'short').toLowerCase()
                  : formatDate(post.metadata.publishedAt)}
              </p>
              <div className="min-w-0">
                <p className="tracking-tight text-neutral-900 transition-all duration-200 ease-out group-hover:text-blue-600 group-focus-visible:text-blue-600 motion-safe:group-hover:translate-x-1 motion-safe:group-focus-visible:translate-x-1 dark:text-neutral-100 dark:group-hover:text-blue-400 dark:group-focus-visible:text-blue-400 motion-reduce:transition-none">
                  {post.metadata.title}
                </p>
                {showCategories && post.metadata.tags && (
                  <p className="mt-1 text-xs text-neutral-500 dark:text-neutral-400">
                    {post.metadata.tags}
                  </p>
                )}
              </div>
            </div>
          </Link>
        ))}
    </div>
  )
}
