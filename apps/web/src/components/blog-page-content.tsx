"use client";

import type {
  QueryAllCategoriesResult,
  QueryBlogIndexPageDataResult,
} from "@workspace/sanity/types";
import { useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState, useTransition } from "react";

import { BlogHeader } from "@/components/blog-card";
import { BlogPagination } from "@/components/blog-pagination";
import { BlogSection } from "@/components/blog-section";
import { PageBuilder } from "@/components/pagebuilder";
import {
  useAlgoliaSearch,
  useAvailableCategories,
  type SortOption,
} from "@/hooks/use-algolia-search";
import type { Blog } from "@/types";
import type { PaginationMetadata } from "@/utils";
import { cn } from "@workspace/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ChevronDown, Command, Loader, Loader2, Search, X } from "lucide-react";
import { AlgoliaBlogCard } from "./algolia-blog-card";
import { SearchInput } from "./blog-search";
import CategoryFilter from "./category-filter";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "A → Z", value: "alphabetical" },
];

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
      const params = new URLSearchParams(searchParams.toString());
      if (updates.categories !== undefined) {
        params.delete("categories");
        for (const c of updates.categories) params.append("categories", c);
      }
      if (updates.query !== undefined) {
        if (updates.query) params.set("query", updates.query);
        else params.delete("query");
      }
      params.delete("page");
      startTransition(() => {
        router.push(`/blog?${params.toString()}`);
      });
    },
    [searchParams, router]
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
    // Optimistic update — local state changes immediately, URL follows
    setLocalCategories(next);
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

  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  return (
    <main className="bg-background border-b relative">
      <div className="container mx-auto border-x pb-20">
        <div className="py-16 px-4 md:px-6">
        <BlogHeader description={description} title={title} />
        </div>

        <div className="flex flex-col-reverse lg:flex-row gap-2 lg:gap-0 items-center justify-between lg:sticky top-16 py-2 px-4 md:px-6 z-10 bg-background/80 backdrop-blur-sm border-y">
            <CategoryFilter
              categories={dynamicCategories} 
              selectedCategories={localCategories}
              hasSearchQuery={query.length > 0}
              onCategoryClick={handleCategoryClick}
              onClear={handleClearCategories}
            />

            <SearchInput
              className="shrink-0 w-full sm:max-w-sm lg:max-w-md"
              onChange={setQuery}
              onClear={() => setQuery("")}
              placeholder="Search blogs..."
              value={query}
            />
        </div>

        <div className="px-4 md:px-6">
          {isActive ? (
            <>
              {isSearching && (
                <p className="mb-6 text-sm text-muted-foreground min-h-40 flex items-center justify-center">
                  <Loader2 className="animate-spin" />
                </p>
              )}
              {!isSearching && results.length === 0 && (
                <div className="py-12 text-center">
                  <p className="text-muted-foreground">
                    {hasQuery
                      ? `No results for "${query}"`
                      : "No posts in this category"}
                  </p>
                </div>
              )}
              {!isSearching && results.length > 0 && (
                <section className="mt-8">
                  <h2 className="sr-only">
                    {hasQuery ? `Results for "${query}"` : "Filtered posts"}
                  </h2>
                  <div className="grid grid-cols-1 gap-x-8 gap-y-12 sm:grid-cols-2 lg:grid-cols-3">
                    {results.map((hit) => (
                      <AlgoliaBlogCard key={hit.objectID} hit={hit} />
                    ))}
                  </div>
                </section>
              )}
            </>
          ) : (
            <div className="mt-10">
              {/* Featured Blog */}
              <span className="uppercase text-xs lg:text-sm">Feauted articles</span>
              <BlogSection blogs={featuredBlogs} isFeatured title="Featured Posts" />

              <div className="flex items-center justify-between">
                <span className="uppercase text-xs lg:text-sm">Latest articles</span>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className="flex items-center shrink-0 gap-2 rounded-md border border-border px-3 py-2 text-sm text-muted-foreground transition-colors hover:text-foreground"
                    >
                      {currentSortLabel}
                      <ChevronDown className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    {SORT_OPTIONS.map((opt) => (
                      <DropdownMenuItem
                        key={opt.value}
                        onClick={() => setSortBy(opt.value)}
                        className={cn(
                          sortBy === opt.value && "font-medium text-foreground"
                        )}
                      >
                        {opt.label}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <BlogSection blogs={sortedRemainingBlogs} title="All Posts" />

              {paginationMetadata?.totalPages > 1 && (
                <BlogPagination
                  className="mt-40 flex justify-center"
                  currentPage={paginationMetadata.currentPage}
                  hasNextPage={paginationMetadata.hasNextPage}
                  hasPreviousPage={paginationMetadata.hasPreviousPage}
                  totalPages={paginationMetadata.totalPages}
                />
              )}
            </div>
          )}
        </div>
      </div>
      {pageBuilder && pageBuilder.length > 0 && (
        <PageBuilder id={_id} pageBuilder={pageBuilder} type={_type} />
      )}
    </main>
  );
}