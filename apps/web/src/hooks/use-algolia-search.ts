"use client";

import { algoliasearch } from "algoliasearch";
import { useEffect, useRef, useState } from "react";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

const INDEX = "blog_posts";

export type AlgoliaHit = {
  objectID: string;
  title: string;
  description: string;
  slug: string;
  publishedAt?: string;
  categories?: { title: string; slug: string }[];
  categorySlugs?: string[];
  author?: { name: string; slug: string };
  authorSlug?: string;
  image?: string;
};

export type SortOption = "newest" | "oldest" | "alphabetical";

const getSortedResults = (hits: AlgoliaHit[], sort: SortOption): AlgoliaHit[] => {
  if (sort === "newest")
    return [...hits].sort((a, b) => (b.publishedAt ?? "").localeCompare(a.publishedAt ?? ""));
  if (sort === "oldest")
    return [...hits].sort((a, b) => (a.publishedAt ?? "").localeCompare(b.publishedAt ?? ""));
  if (sort === "alphabetical")
    return [...hits].sort((a, b) => (a.title ?? "").localeCompare(b.title ?? ""));
  return hits;
};

export function useAlgoliaSearch(
  selectedCategories: string[],
  sortBy: SortOption = "newest",
  query: string = ""
) {
  const [results, setResults] = useState<AlgoliaHit[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  const hasQuery = query.trim().length > 0;
  const hasFilter = selectedCategories.length > 0;
  const isActive = hasQuery || hasFilter;

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!isActive) {
      setResults([]);
      setIsSearching(false);
      return;
    }

    const delay = hasQuery ? 180 : 0;

    debounceRef.current = setTimeout(async () => {
      setIsSearching(true);
      try {
        const filters =
          selectedCategories.length > 0
            ? selectedCategories.map((c) => `categorySlugs:${c}`).join(" AND ")
            : undefined;

        const response = await searchClient.searchSingleIndex<AlgoliaHit>({
          indexName: INDEX,
          searchParams: {
            query: query.trim(),
            hitsPerPage: 20,
            ...(filters ? { filters } : {}),
          },
        });

        setResults(getSortedResults(response.hits, sortBy));
      } catch (err) {
        console.error("Algolia search error:", err);
        setResults([]);
      } finally {
        setIsSearching(false);
      }
    }, delay);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query, selectedCategories.join(","), sortBy]);

  return { results, isSearching, hasQuery, hasFilter, isActive };
}

export function useAvailableCategories(
  selectedCategories: string[],
  query: string = "",
  initialCategories: { title: string; slug: string }[] = []
) {
  const [availableCategories, setAvailableCategories] = useState<{ title: string; slug: string } []> (initialCategories);

  useEffect(() => {
    async function fetch() {
      try {
        const filters =
          selectedCategories.length > 0
            ? selectedCategories.map((c) => `categorySlugs:${c}`).join(" AND ")
            : undefined;

        const response = await searchClient.searchSingleIndex<AlgoliaHit>({
          indexName: INDEX,
          searchParams: {
            query: query.trim(), // use current search text
            hitsPerPage: 100,
            ...(filters ? { filters } : {}),
          },
        });

        const seen = new Set<string>();
        const cats: { title: string; slug: string }[] = [];
        for (const hit of response.hits) {
          for (const cat of hit.categories ?? []) {
            if (!seen.has(cat.slug)) {
              seen.add(cat.slug);
              cats.push(cat);
            }
          }
        }

        setAvailableCategories(
          cats.sort((a, b) => a.title.localeCompare(b.title))
        );
      } catch (err) {
        console.error("Failed to fetch available categories:", err);
      }
    }

    fetch();
  }, [selectedCategories.join(","), query]);

  return availableCategories;
}

export { getSortedResults };
