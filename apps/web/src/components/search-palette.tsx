"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { algoliasearch } from "algoliasearch";
import { useSearchData } from "@/components/search-context";
import { Search, Hash, AtSign, FileText, ArrowRight } from "lucide-react";
import { cn } from "@workspace/ui/lib/utils";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

const INDEX = "blog_posts";

type AlgoliaBlog = {
  objectID: string;
  title: string;
  description: string;
  slug: string;
  publishedAt?: string;
  categories?: { title: string; slug: string }[];
  author?: { name: string; slug: string };
};

type Token =
  | { type: "category"; value: string }
  | { type: "author"; value: string }
  | { type: "text"; value: string };

function parseQuery(raw: string): { tokens: Token[]; plainText: string } {
  const tokens: Token[] = [];
  let plainText = raw;

  const categoryMatches = [...raw.matchAll(/#([\w-]+)/g)];
  const authorMatches = [...raw.matchAll(/@([\w-]+)/g)];

  for (const m of categoryMatches) {
    if (m[1]) tokens.push({ type: "category", value: m[1] });
    plainText = plainText.replace(m[0], "");
  }
  for (const m of authorMatches) {
    if (m[1]) tokens.push({ type: "author", value: m[1] });
    plainText = plainText.replace(m[0], "");
  }

  plainText = plainText.trim();
  if (plainText) tokens.push({ type: "text", value: plainText });

  return { tokens, plainText };
}

function buildSearch(tokens: Token[], plainText: string): {
  query: string;
  filters?: string;
} {
  const categoryTokens = tokens.filter((t) => t.type === "category");
  const authorTokens = tokens.filter((t) => t.type === "author");

  const filterParts: string[] = [];
  for (const t of categoryTokens) {
    filterParts.push(`categorySlugs:${t.value}`);
  }
  for (const t of authorTokens) {
    filterParts.push(`authorSlug:${t.value}`);
  }

  // Include slug terms in text query for prefix matching
  const slugTerms = [
    ...categoryTokens.map((t) => t.value),
    ...authorTokens.map((t) => t.value),
  ].join(" ");

  const combinedQuery = [plainText, slugTerms].filter(Boolean).join(" ");

  return {
    query: combinedQuery,
    ...(filterParts.length > 0 ? { filters: filterParts.join(" AND ") } : {}),
  };
}

function nameToSlug(name: string): string {
  return name.toLowerCase().trim().replace(/\s+/g, "-").replace(/[^a-z0-9-]/g, "");
}

export function SearchPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<AlgoliaBlog[]>([]);
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);
  const itemRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const router = useRouter();
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);

  // Autocomplete hooks and states
  const { allCategories, allAuthors } = useSearchData();
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionIndex, setSuggestionIndex] = useState(0);

  // Detect if user is typing a tag
  const getActiveToken = (q: string) => {
    const catMatch = q.match(/#([\w-]*)$/);
    const authMatch = q.match(/@([\w-]*)$/);
    if (catMatch) return { type: "category", partial: catMatch[1] };
    if (authMatch) return { type: "author", partial: authMatch[1] };
    return null;
  };

  // Update suggestions as query changes
  useEffect(() => {
    const token = getActiveToken(query);
    if (!token) {
      setSuggestions([]);
      return;
    }
    if (token.type === "category") {
      setSuggestions(
        allCategories
          .map((c) => c.slug)
          .filter((s) => s.startsWith(token.partial ?? ""))
          .slice(0, 5)
      );
    } else {
      setSuggestions(
        allAuthors
          .map((a) => a.slug)
          .filter((s) => s.startsWith(token.partial ?? ""))
          .slice(0, 5)
      );
    }
    setSuggestionIndex(0);
  }, [query, allCategories, allAuthors]);

  const applySuggestion = (suggestion: string) => {
    const token = getActiveToken(query);
    if (!token) return;
    const prefix = token.type === "category" ? "#" : "@";
    // Replace the partial token at end of query with full suggestion
    const newQuery = query.replace(
      new RegExp(`${prefix}${token.partial}$`),
      `${prefix}${suggestion} `
    );
    setQuery(newQuery);
    setSuggestions([]);
  };

  

  // CMD+K listener
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      }
      if (e.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // Focus input when opened
  useEffect(() => {
    if (open) {
      setTimeout(() => inputRef.current?.focus(), 50);
      setQuery("");
      setResults([]);
      setSelectedIndex(0);
    }
  }, [open]);

  // Debounced Algolia search
// Debounced Algolia search
  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);

    if (!query.trim()) {
      setResults([]);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoading(true);
      try {
        const { tokens, plainText } = parseQuery(query);

        const categoryTokens = tokens.filter((t) => t.type === "category");
        const authorTokens = tokens.filter((t) => t.type === "author");

        // 1. Resolve partial tags to EXACT facet matches
        const facetPromises: Promise<{ type: string; values: string[] }>[] = [];

        categoryTokens.forEach((t) => {
          facetPromises.push(
            searchClient
              .searchForFacetValues({
                indexName: INDEX,
                facetName: "categorySlugs", // MUST be set as 'searchable' facet in Algolia Dashboard
                searchForFacetValuesRequest: { facetQuery: t.value || "" },
              })
              .then((res) => ({
                type: "categorySlugs",
                values: res.facetHits.map((h) => h.value),
              }))
          );
        });

        authorTokens.forEach((t) => {
          facetPromises.push(
            searchClient
              .searchForFacetValues({
                indexName: INDEX,
                facetName: "authorSlug", // MUST be set as 'searchable' facet in Algolia Dashboard
                searchForFacetValuesRequest: { facetQuery: t.value || "" },
              })
              .then((res) => ({
                type: "authorSlug",
                values: res.facetHits.map((h) => h.value),
              }))
          );
        });

        // Run all facet searches in parallel
        const facetResults = await Promise.all(facetPromises);

        // 2. Build the EXACT filter string
        const filterGroups = facetResults.map((fr) => {
          // If a user types @nonexistent and no facets match, force the query to return 0 results
          if (fr.values.length === 0) return "objectID:null_force_empty";
          
          // Creates an OR group: (authorSlug:ayush-kumar OR authorSlug:ayushman)
          return `(${fr.values.map((v) => `${fr.type}:${v}`).join(" OR ")})`;
        });

        const filters = filterGroups.length > 0 ? filterGroups.join(" AND ") : undefined;

        // 3. Search the blogs cleanly
        const response = await searchClient.searchSingleIndex<AlgoliaBlog>({
          indexName: INDEX,
          searchParams: {
            query: plainText, // ONLY plain text goes here now! No tags to trigger false title matches.
            filters: filters,
            hitsPerPage: 8,
          },
        });

        setResults(response.hits);
        setSelectedIndex(0);
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setLoading(false);
      }
    }, 180);

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [query]);

  // Keyboard navigation
    const handleKeyDown = (e: React.KeyboardEvent) => {
      // Tab autocomplete
      if (e.key === "Tab" && suggestions.length > 0) {
        e.preventDefault();
        if (e.shiftKey) {
          // Shift+Tab — cycle backwards
          setSuggestionIndex((i) => (i - 1 + suggestions.length) % suggestions.length);
        } else {
          // Tab — cycle forwards
          setSuggestionIndex((i) => (i + 1) % suggestions.length);
        }
        return;
      }
      if (e.key === "Enter" && suggestions.length > 0) {
        e.preventDefault();
        applySuggestion(suggestions[suggestionIndex] ?? "");
        return;
      }

      // existing arrow/enter navigation for results
      if (e.key === "ArrowDown") {
          e.preventDefault();
          const next = Math.min(selectedIndex + 1, results.length - 1);
          setSelectedIndex(next);
          itemRefs.current[next]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "ArrowUp") {
          e.preventDefault();
          const prev = Math.max(selectedIndex - 1, 0);
          setSelectedIndex(prev);
          itemRefs.current[prev]?.scrollIntoView({ block: "nearest" });
      } else if (e.key === "Enter" && results[selectedIndex]) {
          navigateTo(results[selectedIndex]);
      }
    };

  const navigateTo = (blog: AlgoliaBlog) => {
    router.push(`/blog/${blog.slug.split("/").pop() || blog.slug}`);
    setOpen(false);
  };

  const { tokens } = parseQuery(query);
  const activeCategories = tokens.filter((t) => t.type === "category");
  const activeAuthors = tokens.filter((t) => t.type === "author");

  if (!open) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-start justify-center pt-[15vh]"
      onClick={() => setOpen(false)}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" />

      {/* Palette */}
      <div
        className="relative w-full max-w-xl rounded-xl border border-border bg-background shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Input row */}
        <div className="flex items-center gap-3 border-b border-border px-4 py-3">
          <Search className="h-4 w-4 shrink-0 text-muted-foreground" />
          <input
            ref={inputRef}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={handleKeyDown}
            placeholder='Search… try #engineering or @elisa-mante'
            className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
          />
          {loading && (
            <span className="text-xs text-muted-foreground">Searching…</span>
          )}
          <kbd className="rounded border border-border px-1.5 py-0.5 font-mono text-xs text-muted-foreground">
            ESC
          </kbd>
        </div>

        {/* auto complete suggestion Menu */}
        {suggestions.length > 0 && (
          <div className="border-b border-border px-4 py-2">
            <p className="mb-1.5 text-xs text-muted-foreground">Suggestions</p>
            <div className="flex flex-wrap gap-1.5">
              {suggestions.map((s, i) => (
                <button
                  key={s}
                  type="button"
                  onClick={() => applySuggestion(s)}
                  className={cn(
                    "rounded border px-2 py-0.5 font-mono text-xs transition-colors",
                    i === suggestionIndex
                      ? "border-foreground bg-foreground text-background"
                      : "border-border text-muted-foreground hover:border-foreground"
                  )}
                >
                  {s}
                  {i === 0 && (
                    <kbd className="ml-1.5 opacity-50">Tab</kbd>
                  )}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Active token pills */}
        {(activeCategories.length > 0 || activeAuthors.length > 0) && (
          <div className="flex flex-wrap gap-1.5 border-b border-border px-4 py-2">
            {activeCategories.map((t) => (
              <span
                key={t.value}
                className="flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium"
              >
                <Hash className="h-3 w-3" />
                {t.value}
              </span>
            ))}
            {activeAuthors.map((t) => (
              <span
                key={t.value}
                className="flex items-center gap-1 rounded-full bg-foreground/10 px-2 py-0.5 text-xs font-medium"
              >
                <AtSign className="h-3 w-3" />
                {t.value}
              </span>
            ))}
          </div>
        )}

        {/* Results */}
        <div className="max-h-90 overflow-y-auto py-2">
          {query && !loading && results.length === 0 && (
            <div className="px-4 py-8 text-center text-sm text-muted-foreground">
              No results for &quot;{query}&quot;
            </div>
          )}

          {!query && (
            <div className="px-4 py-2">
              <div className="rounded-xl border bg-background/40 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <p className="text-sm font-medium text-foreground">
                    Search syntax
                  </p>

                  <span className="text-[10px] uppercase tracking-wider text-muted-foreground">
                    combinable
                  </span>
                </div>

                <div className="space-y-2.5 text-sm">
                  <div className="flex items-start gap-3">
                    <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                      1
                    </span>

                    <div className="min-w-0">
                      <p className="font-mono text-[13px] text-foreground">
                        auth jwt session
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Plain full-text search
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                      2
                    </span>

                    <div className="min-w-0">
                      <p className="font-mono text-[13px] text-foreground">
                        #backend
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Filter by category slug
                      </p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3">
                    <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                      3
                    </span>

                    <div className="min-w-0">
                      <p className="font-mono text-[13px] text-foreground">
                        @ayush
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Filter by author slug
                      </p>
                    </div>
                  </div>

                  {/* <div className="flex items-start gap-3">
                    <span className="w-5 shrink-0 text-xs font-medium text-muted-foreground">
                      4
                    </span>

                    <div className="min-w-0">
                      <p className="font-mono text-[13px] text-foreground">
                        middleware &gt; redis
                      </p>

                      <p className="mt-0.5 text-xs text-muted-foreground">
                        Match blogs containing text after{" "}
                        <span className="font-mono">&gt;</span>
                      </p>
                    </div>
                  </div> */}
                </div>

                <div className="mt-4 border-t pt-3">
                  <p className="text-[11px] leading-relaxed text-muted-foreground">
                    Combine filters freely:
                  </p>

                  <p className="mt-1 font-mono text-[12px] text-foreground/90">
                    {/* auth #backend @ayush &gt; redis */}
                    auth #backend @ayush
                  </p>
                </div>
              </div>
            </div>
          )}

          {results.map((blog, i) => (
            <button
              key={blog.objectID}
              ref={(el) => { itemRefs.current[i] = el; }}
              type="button"
              onClick={() => navigateTo(blog)}
              className={cn(
                "flex w-full items-start gap-3 px-4 py-3 text-left transition-colors",
                i === selectedIndex
                  ? "bg-foreground/5"
                  : "hover:bg-foreground/5"
              )}
              onMouseEnter={() => setSelectedIndex(i)}
            >
              <FileText className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <div className="flex-1 min-w-0">
                <p className="truncate text-sm font-medium">{blog.title}</p>
                {blog.description && (
                    <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {blog.description}
                    </p>
                )}
                {blog.publishedAt && (
                    <p className="mt-0.5 text-xs text-muted-foreground/60">
                        {new Date(blog.publishedAt).toLocaleDateString("en-US", {
                        year: "numeric",
                        month: "short",
                        day: "numeric",
                        })}
                    </p>
                )}
                <div className="mt-1 flex flex-wrap gap-1">
                  {blog.categories?.map((cat) => (
                    <span
                      key={cat.slug}
                      className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-muted-foreground"
                    >
                      #{cat.slug}
                    </span>
                  ))}
                  {blog.author?.name && (
                    <span className="rounded-full bg-foreground/8 px-2 py-0.5 text-xs text-muted-foreground">
                        @{nameToSlug(blog.author.name)}
                    </span>
                  )}
                </div>
              </div>
              <ArrowRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground opacity-0 transition-opacity group-hover:opacity-100" />
            </button>
          ))}
        </div>

        {/* Footer hint */}
        <div className="flex items-center justify-between border-t border-border px-4 py-2">
          <span className="text-xs text-muted-foreground">
            ↑↓ navigate · Enter select · Esc close
          </span>
          <span className="text-xs text-muted-foreground">
            Powered by Algolia
          </span>
        </div>
      </div>
    </div>
  );
}