import Link from "next/link";
import type { AlgoliaHit } from "@/hooks/use-algolia-search";

function AlgoliaBlogImage({ url, title }: { url?: string; title?: string | null }) {
  if (!url) return null;
  return (
    <img
      src={url}
      alt={title ?? "Blog post image"}
      className="aspect-video w-full rounded-2xl bg-gray-100 object-cover"
      width={800}
      height={400}
    />
  );
}

export function AlgoliaBlogCard({ hit }: { hit: AlgoliaHit }) {
  const { title, description, slug, publishedAt, image, author, categories } = hit;
  const path = `/blog/${slug.split("/").pop()}`;

  return (
    <article className="grid w-full grid-cols-1 gap-4">
      <div className="relative aspect-video h-auto w-full overflow-hidden rounded-2xl">
        <AlgoliaBlogImage url={image} title={title} />
        <div className="absolute inset-0 rounded-2xl ring-1 ring-gray-900/10 ring-inset" />
      </div>
      <div className="w-full space-y-4">
        <div className="my-4 flex items-center gap-x-4 text-xs">
          {publishedAt && (
            <time className="text-muted-foreground" dateTime={publishedAt}>
              {new Date(publishedAt).toLocaleDateString("en-US", {
                year: "numeric",
                month: "short",
                day: "numeric",
              })}
            </time>
          )}
          {categories?.map((cat) => (
            <span
              key={cat.slug}
              className="text-muted-foreground"
            >
              {cat.title}
            </span>
          ))}
        </div>
        <div className="group relative">
          <h3 className="mt-3 text-lg font-semibold leading-6">
            <Link href={path}>
              <span className="absolute inset-0" />
              {title}
            </Link>
          </h3>
          <p className="mt-5 text-muted-foreground text-sm leading-6">
            {description}
          </p>
          {author?.name && (
            <p className="mt-2 text-xs text-muted-foreground">
              by {author.name}
            </p>
          )}
        </div>
      </div>
    </article>
  );
}