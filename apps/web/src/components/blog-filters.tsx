"use client";

import { SearchInput } from "./blog-search";
import CategoryFilter from "./category-filter";

type BlogFiltersProps = {
  dynamicCategories: { title: string; slug: string }[];
  selectedCategories: string[];
  query: string;
  onCategoryClick: (slug: string) => void;
  onClearCategories: () => void;
  onQueryChange: (q: string) => void;
  onQueryClear: () => void;
};

export function BlogFilters({
  dynamicCategories,
  selectedCategories,
  query,
  onCategoryClick,
  onClearCategories,
  onQueryChange,
  onQueryClear,
}: BlogFiltersProps) {
  return (
    <div className="flex flex-col-reverse lg:flex-row gap-2 lg:gap-0 items-center justify-between lg:sticky top-16 py-2 px-4 md:px-6 z-10 bg-background/80 backdrop-blur-sm border-y">
      <CategoryFilter
        categories={dynamicCategories}
        selectedCategories={selectedCategories}
        hasSearchQuery={query.length > 0}
        onCategoryClick={onCategoryClick}
        onClear={onClearCategories}
      />

      <SearchInput
        className="shrink-0 w-full sm:max-w-sm lg:max-w-md"
        onChange={onQueryChange}
        onClear={onQueryClear}
        placeholder="Search blogs..."
        value={query}
      />
    </div>
  );
}