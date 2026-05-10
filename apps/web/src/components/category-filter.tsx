import React from "react";
import { X } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

// Define the shape of a category based on how it's used in the main component
export type Category = {
  slug?: string | null;
  title?: string | null;
};

export interface CategoryFilterProps {
  categories: Category[];
  selectedCategories: string[];
  hasSearchQuery: boolean;
  onCategoryClick: (slug: string) => void;
  onClear: () => void;
}

const CategoryFilter = ({
  categories,
  selectedCategories,
  hasSearchQuery,
  onCategoryClick,
  onClear,
}: CategoryFilterProps) => {
  if (!categories || categories.length === 0) return null;

  const showClearAll = selectedCategories.length > 0 || hasSearchQuery;

  return (
    <div className="flex flex-wrap gap-2">
      {categories.map((cat) => {
        const slug = cat.slug ?? "";
        if (!slug) return null;

        const isSelected = selectedCategories.includes(slug);

        return (
          <button
            key={slug}
            type="button"
            onClick={() => onCategoryClick(slug)}
            className={cn(
              "cursor-pointer rounded-lg border px-2 py-1.5 text-sm font-medium transition-colors",
              isSelected
                ? "border-foreground bg-foreground text-background hover:bg-foreground/90"
                : "border-border bg-muted text-muted-foreground hover:border-foreground hover:text-foreground"
            )}
          >
            {cat.title}
          </button>
        );
      })}
      
      {showClearAll && (
        <button
          type="button"
          onClick={onClear}
          className="cursor-pointer rounded-lg border border-border px-2 py-1.5 text-sm font-medium text-muted-foreground transition-colors hover:border-foreground hover:text-foreground"
        >
          <span className="flex items-center gap-1">
            Clear All
            <X size={16} />
          </span>
        </button>
      )}
    </div>
  );
};

export default CategoryFilter;