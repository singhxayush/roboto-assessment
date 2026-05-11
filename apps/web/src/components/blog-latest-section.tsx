"use client";

import { BlogSection } from "./blog-section";
import { cn } from "@workspace/ui/lib/utils";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@workspace/ui/components/dropdown-menu";
import { ChevronDown } from "lucide-react";
import type { Blog } from "@/types";
import type { SortOption } from "@/hooks/use-algolia-search";

const SORT_OPTIONS: { label: string; value: SortOption }[] = [
  { label: "Newest first", value: "newest" },
  { label: "Oldest first", value: "oldest" },
  { label: "A → Z", value: "alphabetical" },
];

type BlogLatestSectionProps = {
  sortedRemainingBlogs: Blog[];
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
};

type SortDropdownProps = {
  sortBy: SortOption;
  onSortChange: (sort: SortOption) => void;
};

function SortDropdown({ sortBy, onSortChange }: SortDropdownProps) {
  const currentSortLabel =
    SORT_OPTIONS.find((option) => option.value === sortBy)?.label ?? "Sort";

  return (
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
            onClick={() => onSortChange(opt.value)}
            className={cn(
              sortBy === opt.value && "font-medium text-foreground"
            )}
          >
            {opt.label}
          </DropdownMenuItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export function BlogLatestSection({
  sortedRemainingBlogs,
  sortBy,
  onSortChange,
}: BlogLatestSectionProps) {
  const currentSortLabel =
    SORT_OPTIONS.find((o) => o.value === sortBy)?.label ?? "Sort";

  return (
    <>
      <div className="flex items-center justify-between">
        <span className="uppercase text-xs lg:text-sm">Latest articles</span>
        <SortDropdown sortBy={sortBy} onSortChange={onSortChange} />
      </div>

      <BlogSection blogs={sortedRemainingBlogs} title="All Posts" />
    </>
  );
}