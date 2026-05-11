"use client";

import type {
  QueryAllCategoriesResult,
  QueryBlogIndexPageDataResult,
} from "@workspace/sanity/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { PageBuilder } from "@/components/pagebuilder";
import {
  useAlgoliaSearch,
  useAvailableCategories,
  type SortOption,
} from "@/hooks/use-algolia-search";
import type { Blog } from "@/types";
import type { PaginationMetadata } from "@/utils";
import { BlogPageHeader } from "./blog-page-header";
import { BlogFilters } from "./blog-filters";
import { BlogContent } from "./blog-content";

type BlogPageContentProps = {
  indexPageData: NonNullable<QueryBlogIndexPageDataResult>;
  blogs: Blog[];
  paginationMetadata: PaginationMetadata;
  availableCategories: NonNullable<QueryAllCategoriesResult>;
  selectedCategories: string[];
  initialQuery: string;
};

export function BlogPageContent({
  indexPageData,
  blogs,
  paginationMetadata,
  availableCategories,
  selectedCategories,
  initialQuery,
}: BlogPageContentProps) {
  const {
    title,
    description,
    pageBuilder = [],
    _id,
    _type,
    featuredBlogsCount,
    displayFeaturedBlogs,
  } = indexPageData;

  const router = useRouter();
  const searchParams = useSearchParams();

  const [localCategories, setLocalCategories] = useState<string[]>(selectedCategories);
  const [sortBy, setSortBy] = useState<SortOption>("newest");
  const [query, setQueryState] = useState(initialQuery);
  const [, startTransition] = useTransition();

  // Debounce ref for URL sync only
  const queryDebounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  useEffect(() => {
    const cats = searchParams.getAll("categories");
    const q = searchParams.get("query") ?? "";
    setLocalCategories(cats);
    setQueryState(q);
  }, [searchParams]);

  // Only push to history for query (shareable), replace for categories (instant)
  const pushURL = useCallback(
    (updates: { categories?: string[]; query?: string }) => {
      const params = new URLSearchParams(window.location.search);

      if (updates.categories !== undefined) {
        params.delete("categories");
        updates.categories.forEach((c) => params.append("categories", c));
      }

      if (updates.query !== undefined) {
        if (updates.query) params.set("query", updates.query);
        else params.delete("query");
      }

      params.delete("page");

      // This updates the URL in the browser without triggering a Next.js server-side re-render
      const newRelativePathQuery = window.location.pathname + "?" + params.toString();
      window.history.replaceState(null, "", newRelativePathQuery);
    },
    []
  );

  const setQuery = useCallback(
    (q: string) => {
      setQueryState(q); // instant local update
      // Sync to URL without triggering server re-render
      if (queryDebounceRef.current) clearTimeout(queryDebounceRef.current);
      queryDebounceRef.current = setTimeout(() => {
        const params = new URLSearchParams(searchParams.toString());
        if (q) params.set("query", q);
        else params.delete("query");
        params.delete("page");
        window.history.replaceState(null, "", `/blog?${params.toString()}`);
      }, 500);
    },
    [searchParams]
  );

  const handleCategoryClick = (slug: string) => {
    const next = localCategories.includes(slug)
      ? localCategories.filter((c) => c !== slug)
      : [...localCategories, slug];

    // Update local state for instant UI feedback
    setLocalCategories(next);
    // Update URL silently
    pushURL({ categories: next });
  };

  const handleClearCategories = () => {
    setLocalCategories([]);
    setQueryState("");
    pushURL({ categories: [], query: "" });
  };

  const { results, isSearching, hasQuery, isActive } = useAlgoliaSearch(
    localCategories,
    sortBy,
    query
  );

  const dynamicCategories = useAvailableCategories(
    localCategories,
    query,
    availableCategories as { title: string; slug: string }[]
  );

  const validFeaturedBlogsCount = featuredBlogsCount
    ? Number.parseInt(featuredBlogsCount, 10)
    : 0;

  // Featured blogs only hidden when search or category filter active — NOT sort
  const hasSearchOrFilter = hasQuery || localCategories.length > 0;

  const shouldDisplayFeaturedBlogs =
    displayFeaturedBlogs &&
    validFeaturedBlogsCount > 0 &&
    paginationMetadata.currentPage === 1 &&
    !hasSearchOrFilter;

  const featuredBlogs = shouldDisplayFeaturedBlogs
    ? blogs.slice(0, validFeaturedBlogsCount)
    : [];

  // Apply sort to Sanity list client-side when not in search/filter mode
  const sortedRemainingBlogs = useMemo(() => {
    const base = shouldDisplayFeaturedBlogs
      ? blogs.slice(validFeaturedBlogsCount)
      : blogs;

    // Convert Blog[] to sortable shape — getSortedResults expects AlgoliaHit
    // so we sort directly here
    if (sortBy === "newest")
      return [...base].sort((a, b) =>
        (b.publishedAt ?? "").localeCompare(a.publishedAt ?? "")
      );
    if (sortBy === "oldest")
      return [...base].sort((a, b) =>
        (a.publishedAt ?? "").localeCompare(b.publishedAt ?? "")
      );
    if (sortBy === "alphabetical")
      return [...base].sort((a, b) =>
        (a.title ?? "").localeCompare(b.title ?? "")
      );
    return base;
  }, [blogs, sortBy, shouldDisplayFeaturedBlogs, validFeaturedBlogsCount]);

  return (
    <main className="bg-background border-b relative">
      <div className="container mx-auto border-x pb-20">
        <BlogPageHeader title={title} description={description} />

        <BlogFilters
          dynamicCategories={dynamicCategories}
          selectedCategories={localCategories}
          query={query}
          onCategoryClick={handleCategoryClick}
          onClearCategories={handleClearCategories}
          onQueryChange={setQuery}
          onQueryClear={() => setQuery("")}
        />

        <div className="px-4 md:px-6">
          <BlogContent
            isActive={isActive}
            results={results}
            isSearching={isSearching}
            hasQuery={hasQuery}
            query={query}
            featuredBlogs={featuredBlogs}
            sortedRemainingBlogs={sortedRemainingBlogs}
            sortBy={sortBy}
            onSortChange={setSortBy}
            paginationMetadata={paginationMetadata}
          />
        </div>
      </div>
      {pageBuilder && pageBuilder.length > 0 && (
        <PageBuilder id={_id} pageBuilder={pageBuilder} type={_type} />
      )}
    </main>
  );
}