import ListLayout from '@/layouts/ListLayoutWithTags';
import { allCoreContent, sortPosts } from 'pliny/utils/contentlayer';
import { allPosts } from 'contentlayer/generated';

const POSTS_PER_PAGE = 6

export const generateStaticParams = async () => {
  const totalPages = Math.ceil(allPosts.length / POSTS_PER_PAGE)
  const paths = Array.from({ length: totalPages }, (_, i) => ({ page: (i + 1).toString() }))

  return paths
}

export default function Page({ params }: { params: { page: string } }) {
  const posts = allCoreContent(sortPosts(allPosts));
  const pageNumber = parseInt(params.page as string)
  const initialDisplayPosts = posts.slice(
      POSTS_PER_PAGE * (pageNumber - 1),
      POSTS_PER_PAGE * pageNumber
  )
  const pagination = {
    currentPage: pageNumber,
    totalPages: Math.ceil(posts.length / POSTS_PER_PAGE),
  }

  return (
    <ListLayout
      posts={posts}
      initialDisplayPosts={initialDisplayPosts}
      pagination={pagination}
      title=""
    />
  )
}
