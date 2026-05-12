"use client";

import { Loader2 } from "lucide-react";
import { AlgoliaBlogCard } from "./algolia-blog-card";
import type { AlgoliaHit } from "@/hooks/use-algolia-search";

type BlogAlgoliaSearchResultsProps = {
  results: AlgoliaHit[];
  isSearching: boolean;
  hasQuery: boolean;
  query: string;
};

export function BlogAlgoliaSearchResults({
  results,
  isSearching,
  hasQuery,
  query,
}: BlogAlgoliaSearchResultsProps) {
  if (isSearching) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">
          <Loader2 className="animate-spin" />
        </p>
      </div>
    );
  }

  if (results.length === 0) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-muted-foreground">
          {hasQuery ? `No results for "${query}"` : "No posts in this category"}
        </p>
      </div>
    );
  }

  return (
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
  );
}