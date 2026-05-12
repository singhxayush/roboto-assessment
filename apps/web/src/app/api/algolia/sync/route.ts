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

const querySingleBlogForAlgolia = defineQuery(`
  *[_type == "blog" && _id == $id && (seoHideFromLists != true) && defined(slug.current)][0]{
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

function enrichBlog(blog: Record<string, any>) {
  return {
    ...blog,
    author: blog.author
      ? { ...blog.author, slug: nameToSlug(blog.author.name ?? "") }
      : null,
    categorySlugs: (blog.categories ?? []).map((c: any) => c.slug),
    categoryTitles: (blog.categories ?? []).map((c: any) => c.title),
    authorSlug: blog.author ? nameToSlug(blog.author.name ?? "") : null,
  };
}

async function syncAllBlogs() {
  const algolia = getAlgoliaAdminClient();
  const blogs = await client.fetch(queryBlogsForAlgolia);
  if (!blogs?.length) return { message: "No blogs to index" };
  await algolia.saveObjects({
    indexName: ALGOLIA_INDEX,
    objects: blogs.map(enrichBlog),
  });
  return { message: `Indexed ${blogs.length} blogs` };
}

async function syncSingleBlog(id: string) {
  const algolia = getAlgoliaAdminClient();
  const blog = await client.fetch(querySingleBlogForAlgolia, { id });
  if (!blog) {
    // Blog was deleted or unpublished — remove from Algolia
    await algolia.deleteObject({ indexName: ALGOLIA_INDEX, objectID: id });
    return { message: `Removed ${id} from index` };
  }
  await algolia.saveObject({
    indexName: ALGOLIA_INDEX,
    body: enrichBlog(blog),
  });
  return { message: `Indexed blog ${blog.slug}` };
}

// Manual full sync (GET)
export async function GET() {
  try {
    const result = await syncAllBlogs();
    return NextResponse.json(result);
  } catch (error) {
    console.error("Algolia sync error:", error);
    return NextResponse.json({ error: "Sync failed" }, { status: 500 });
  }
}

// Sanity webhook (POST)
export async function POST(req: NextRequest) {
  try {
    // Verify webhook secret to prevent abuse
    const secret = req.headers.get("x-webhook-secret");
    if (secret !== process.env.SANITY_WEBHOOK_SECRET) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    const { _id, _type, operation } = body;

    // Only handle blog documents
    if (_type !== "blog") {
      return NextResponse.json({ message: "Ignored non-blog document" });
    }

    if (operation === "delete") {
      const algolia = getAlgoliaAdminClient();
      await algolia.deleteObject({ indexName: ALGOLIA_INDEX, objectID: _id });
      return NextResponse.json({ message: `Deleted ${_id} from index` });
    }

    const result = await syncSingleBlog(_id);
    return NextResponse.json(result);
  } catch (error) {
    console.error("Webhook error:", error);
    return NextResponse.json({ error: "Webhook failed" }, { status: 500 });
  }
}
