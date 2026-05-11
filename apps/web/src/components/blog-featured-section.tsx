"use client";

import { BlogSection } from "./blog-section";
import type { Blog } from "@/types";

type BlogFeaturedSectionProps = {
  featuredBlogs: Blog[];
};

export function BlogFeaturedSection({ featuredBlogs }: BlogFeaturedSectionProps) {
  if (featuredBlogs.length === 0) return null;

  return (
    <>
      <span className="uppercase text-xs lg:text-sm">Featured articles</span>
      <BlogSection blogs={featuredBlogs} isFeatured title="Featured Posts" />
    </>
  );
}