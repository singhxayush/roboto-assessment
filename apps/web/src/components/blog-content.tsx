"use client";

import { BlogPagination } from "./blog-pagination";
import { BlogAlgoliaSearchResults } from "./blog-algolia-search-results";
import { BlogFeaturedSection } from "./blog-featured-section";
import { BlogLatestSection } from "./blog-latest-section";
import type { Blog } from "@/types";
import type { PaginationMetadata } from "@/utils";
import type { SortOption, AlgoliaHit } from "@/hooks/use-algolia-search";

type BlogContentProps = {
  isActive: boolean;
  results: AlgoliaHit[];
  isSearching: boolean;
  hasQuery: boolean;
  query: string;
  featuredBlogs: Blog[];
  sortedRemainingBlogs: Blog[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
  paginationMetadata: PaginationMetadata;
};

export function BlogContent({
  isActive,
  results,
  isSearching,
  hasQuery,
  query,
  featuredBlogs,
  sortedRemainingBlogs,
  sortBy,
  onSortChange,
  paginationMetadata,
}: BlogContentProps) {
  return (
    <div className="mt-10">
      {isActive ? (
        <BlogAlgoliaSearchResults
          results={results}
          isSearching={isSearching}
          hasQuery={hasQuery}
          query={query}
        />
      ) : (
        <>
          <BlogFeaturedSection featuredBlogs={featuredBlogs} />

          <BlogLatestSection
            sortedRemainingBlogs={sortedRemainingBlogs}
            sortBy={sortBy}
            onSortChange={onSortChange}
          />

          {paginationMetadata?.totalPages > 1 && (
            <BlogPagination
              className="mt-40 flex justify-center"
              currentPage={paginationMetadata.currentPage}
              hasNextPage={paginationMetadata.hasNextPage}
              hasPreviousPage={paginationMetadata.hasPreviousPage}
              totalPages={paginationMetadata.totalPages}
            />
          )}
        </>
      )}
    </div>
  );
}