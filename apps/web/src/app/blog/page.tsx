import { sanityFetch } from "@workspace/sanity/live";
import {
  queryAvailableCategories,
  queryBlogIndexPageBlogs,
  queryBlogIndexPageBlogsCount,
  queryBlogIndexPageData,
} from "@workspace/sanity/query";
import { notFound } from "next/navigation";

import { BlogHeader } from "@/components/blog-card";
import { BlogPageContent } from "@/components/blog-page-content";
import { PageBuilder } from "@/components/pagebuilder";
import { getSEOMetadata } from "@/lib/seo";
import {
  calculatePaginationMetadata,
  getBlogPaginationStartEnd,
  handleErrors,
} from "@/utils";

async function fetchBlogIndexPageData() {
  const res = await sanityFetch({ query: queryBlogIndexPageData });
  return res.data;
}

async function fetchBlogIndexPageBlogs(start: number, end: number, categories: string[]) {
  const res = await sanityFetch({
    query: queryBlogIndexPageBlogs,
    params: { start, end, categories },
  });
  return res.data;
}

async function fetchBlogIndexPageBlogsCount(categories: string[]) {
  const res = await sanityFetch({
    query: queryBlogIndexPageBlogsCount,
    params: { categories },
  });
  return res.data;
}

async function fetchAvailableCategories(categories: string[]) {
  const res = await sanityFetch({
    query: queryAvailableCategories,
    params: { categories },
  });
  return res.data;
}

export async function generateMetadata() {
  const { data: result } = await sanityFetch({ query: queryBlogIndexPageData });
  return getSEOMetadata({
    title: result?.title ?? result?.seoTitle,
    description: result?.description ?? result?.seoDescription,
    slug: "/blog",
    contentId: result?._id,
    contentType: result?._type,
  });
}

type BlogPageProps = {
  searchParams: Promise<{
    page?: string;
    categories?: string | string[];
    query?: string;
  }>;
};

export default async function BlogIndexPage({ searchParams }: BlogPageProps) {
  const { page, categories: categoriesParam, query: queryParam } = await searchParams;
  const initialQuery = queryParam ?? "";
  const currentPage = page ? Number(page) : 1;
  const selectedCategories = categoriesParam
    ? Array.isArray(categoriesParam) ? categoriesParam : [categoriesParam]
    : [];

  const [
    [indexPageData, errIndexPageData],
    [totalCount, errTotalCount],
    [availableCategories],
  ] = await Promise.all([
    handleErrors(fetchBlogIndexPageData()),
    handleErrors(fetchBlogIndexPageBlogsCount(selectedCategories)),
    handleErrors(fetchAvailableCategories(selectedCategories)),
  ]);

  if (errIndexPageData || !indexPageData) notFound();

  if (errTotalCount || totalCount === null || totalCount === undefined) {
    return (
      <main className="container mx-auto my-16 px-4 md:px-6">
        <BlogHeader description={indexPageData.description} title={indexPageData.title} />
        <div className="py-12 text-center">
          <p className="text-muted-foreground">Unable to load blog posts at the moment.</p>
        </div>
        {indexPageData.pageBuilder && indexPageData.pageBuilder.length > 0 && (
          <PageBuilder id={indexPageData._id} pageBuilder={indexPageData.pageBuilder} type={indexPageData._type} />
        )}
      </main>
    );
  }

  const featuredBlogsCount = indexPageData.displayFeaturedBlogs
    ? Number(indexPageData.featuredBlogsCount) || 0
    : 0;

  const paginationMetadata = calculatePaginationMetadata(totalCount, currentPage);
  const { start, end } = getBlogPaginationStartEnd(currentPage);
  const blogStart = currentPage === 1 ? 0 : start + featuredBlogsCount;
  const blogEnd = end + featuredBlogsCount;

  const [blogs, errBlogs] = await handleErrors(
    fetchBlogIndexPageBlogs(blogStart, blogEnd, selectedCategories)
  );

  if (errBlogs || !blogs) {
    return (
      <main className="container mx-auto my-16 px-4 md:px-6">
        <BlogHeader description={indexPageData.description} title={indexPageData.title} />
        <div className="py-12 text-center">
          <p className="text-muted-foreground">No blog posts available at the moment.</p>
        </div>
        {indexPageData.pageBuilder && indexPageData.pageBuilder.length > 0 && (
          <PageBuilder id={indexPageData._id} pageBuilder={indexPageData.pageBuilder} type={indexPageData._type} />
        )}
      </main>
    );
  }

  return (
    <BlogPageContent
      blogs={blogs}
      availableCategories={availableCategories ?? []}
      selectedCategories={selectedCategories}
      initialQuery={initialQuery}
      indexPageData={indexPageData}
      paginationMetadata={paginationMetadata}
    />
  );
}