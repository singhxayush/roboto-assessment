"use client";

import { BlogHeader } from "@/components/blog-card";

type BlogPageHeaderProps = {
  title?: string | null;
  description?: string | null;
};

export function BlogPageHeader({ title, description }: BlogPageHeaderProps) {
  return (
    <div className="py-16 px-4 md:px-6">
      <BlogHeader description={description!} title={title!} />
    </div>
  );
}