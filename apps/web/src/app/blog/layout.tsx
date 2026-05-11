import { sanityFetch } from "@workspace/sanity/live";
import { queryAllCategories, queryAllAuthors } from "@workspace/sanity/query";
import { SearchProvider } from "@/components/search-context";
import { SearchPalette } from "@/components/search-palette";

export default async function BlogLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const [catRes, authRes] = await Promise.all([
        sanityFetch({ query: queryAllCategories }),
        sanityFetch({ query: queryAllAuthors }),
    ]);

    const allCategories = (catRes.data ?? []).map((c) => ({
        title: c.title ?? "",
        slug: c.slug ?? "",
    }));

    const allAuthors = (authRes.data ?? []).map((a: { name: any; }) => ({
        name: a.name ?? "",
        slug: nameToSlug(a.name ?? ""),
    }));

    return (
        <SearchProvider allCategories={allCategories} allAuthors={allAuthors}>
            {children}
            <SearchPalette />
        </SearchProvider>
    );
}

function nameToSlug(name: string) {
    return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}