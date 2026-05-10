import { client } from "@workspace/sanity/client";
import { defineQuery } from "next-sanity";
import { type NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminClient, ALGOLIA_INDEX } from "@/lib/algolia";

const queryBlogsForAlgolia = defineQuery(`
  *[_type == "blog" && (seoHideFromLists != true) && defined(slug.current)]{
    "objectID": _id,
    title,
    description,
    "slug": slug.current,
    publishedAt,
    "categories": categories[]->{
      title,
      "slug": slug.current
    },
    "author": authors[0]->{
      name
    },
    "image": image.asset->url
  }
`);

function nameToSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

async function syncToAlgolia() {
  const algolia = getAlgoliaAdminClient();

    await algolia.setSettings({
        indexName: ALGOLIA_INDEX,
        indexSettings: {
            searchableAttributes: [
                "title",
                "description",
                "authorSlug",
                "categorySlugs",
                "categoryTitles",
                "author.name",
            ],
            attributesForFaceting: [
                "categorySlugs",
                "authorSlug",
            ],
        },
    });

  const blogs = await client.fetch(queryBlogsForAlgolia);

  if (!blogs || blogs.length === 0) {
    return { message: "No blogs to index" };
  }

  // Inject auto-generated author slug
    const enriched = blogs.map((blog: Record<string, any>) => ({
        ...blog,
        author: blog.author
            ? {
                ...blog.author,
                slug: nameToSlug(blog.author.name ?? ""),
            }
            : null,
        // Flat arrays for reliable Algolia filtering
        categorySlugs: (blog.categories ?? []).map((c: any) => c.slug),
        categoryTitles: (blog.categories ?? []).map((c: any) => c.title),
        authorSlug: blog.author ? nameToSlug(blog.author.name ?? "") : null,
    }));

  await algolia.saveObjects({
    indexName: ALGOLIA_INDEX,
    objects: enriched,
  });

  return { message: `Indexed ${blogs.length} blogs` };
}

export async function POST(_req: NextRequest) {
  try {
    const result = await syncToAlgolia();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Algolia sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

export async function GET() {
  try {
    const result = await syncToAlgolia();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Algolia sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}