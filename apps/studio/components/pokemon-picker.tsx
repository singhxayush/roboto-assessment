import { algoliasearch } from "algoliasearch";
import React, { useCallback, useEffect, useRef, useState } from "react";
import { set, unset } from "sanity";
import type { StringInputProps } from "sanity";
import { Box, Button, Card, Flex, Spinner, Stack, Text, TextInput } from "@sanity/ui";

const searchClient = algoliasearch(
  process.env.SANITY_STUDIO_ALGOLIA_APP_ID!,
  process.env.SANITY_STUDIO_ALGOLIA_SEARCH_KEY!
);

const INDEX = "pokemon";

type PokemonHit = {
  objectID: string;
  name: string;
  displayName: string;
  sprite: string;
  types: string[];
};

const TYPE_COLORS: Record<string, string> = {
  fire: "#F08030", water: "#6890F0", grass: "#78C850",
  electric: "#F8D030", psychic: "#F85888", ice: "#98D8D8",
  dragon: "#7038F8", dark: "#705848", fairy: "#EE99AC",
  normal: "#A8A878", fighting: "#C03028", flying: "#A890F0",
  poison: "#A040A0", ground: "#E0C068", rock: "#B8A038",
  bug: "#A8B820", ghost: "#705898", steel: "#B8B8D0",
};

export function PokemonPicker(props: StringInputProps) {
  const { value, onChange } = props;
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PokemonHit[]>([]);
  const [isOpen, setIsOpen] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [selected, setSelected] = useState<PokemonHit | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout>>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const [hoveredIndex, setHoveredIndex] = useState(0);
  const itemRefs = useRef<(HTMLElement | null)[]>([]);

  useEffect(() => {
    if (!isOpen || results.length === 0) return;
    itemRefs.current[hoveredIndex]?.scrollIntoView({ block: "nearest" });
  }, [hoveredIndex, isOpen, results.length]);

  const onKeyDown = (e: React.KeyboardEvent) => {
    if (!isOpen || results.length === 0) return;

    if (e.key === "ArrowDown") {
      e.preventDefault();
      setHoveredIndex((i) => Math.min(i + 1, results.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setHoveredIndex((i) => Math.max(i - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      handleSelect(results[hoveredIndex]);
    } else if (e.key === "Escape") {
      setIsOpen(false);
    }
  }
  useEffect(() => {
    if (!value) return;
    searchClient
      .searchSingleIndex<PokemonHit>({
        indexName: INDEX,
        searchParams: { query: value, hitsPerPage: 1 },
      })
      .then((res) => {
        if (res.hits[0]) setSelected(res.hits[0]);
      });
  }, [value]);

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (!query.trim()) { setResults([]); return; }
    debounceRef.current = setTimeout(async () => {
      setIsLoading(true);
      try {
        const res = await searchClient.searchSingleIndex<PokemonHit>({
          indexName: INDEX,
          searchParams: { query, hitsPerPage: 8 },
        });
        setResults(res.hits);
        setIsOpen(true);
      } finally {
        setIsLoading(false);
      }
    }, 200);
  }, [query]);

  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (!containerRef.current?.contains(e.target as Node)) setIsOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, []);

    useEffect(() => {
        setHoveredIndex(0);
    }, [results]);

  const handleSelect = useCallback((pokemon: PokemonHit) => {
    setSelected(pokemon);
    setQuery("");
    setIsOpen(false);
    onChange(set(pokemon.name));
  }, [onChange]);

  const handleClear = useCallback(() => {
    setSelected(null);
    setQuery("");
    onChange(unset());
  }, [onChange]);

  return (
    <div ref={containerRef} style={{ position: "relative" }}>
      {selected ? (
        <Card padding={3} radius={2} shadow={1}>
          <Flex align="center" gap={3}>
            <img
              src={selected.sprite}
              alt={selected.displayName}
              style={{ width: 72, height: 72, imageRendering: "pixelated" }}
            />
            <Stack space={2} flex={1}>
              <Text size={2} weight="semibold">{selected.displayName}</Text>
              <Flex gap={1}>
                {selected.types.map((t) => (
                  <span
                    key={t}
                    style={{
                      background: TYPE_COLORS[t] ?? "#999",
                      color: "#fff",
                      borderRadius: 4,
                      padding: "2px 8px",
                      fontSize: 11,
                      fontWeight: 600,
                      textTransform: "capitalize",
                    }}
                  >
                    {t}
                  </span>
                ))}
              </Flex>
            </Stack>
            <Button
              mode="ghost"
              text="Change"
              onClick={handleClear}
              fontSize={1}
            />
          </Flex>
        </Card>
      ) : (
        <Stack space={2}>
          <Flex align="center" gap={2}>
            <Box flex={1}>
              <TextInput
                value={query}
                onChange={(e) => setQuery(e.currentTarget.value)}
                onKeyDown={onKeyDown}
                placeholder="Search Pokémon… (e.g. pikachu, char)"
              />
            </Box>
            {isLoading && <Spinner muted />}
          </Flex>

          {isOpen && results.length > 0 && (
            <Card
              shadow={2}
              radius={2}
              style={{
                position: "absolute",
                top: "calc(100% + 4px)",
                left: 0,
                right: 0,
                zIndex: 1000,
                maxHeight: 320,
                overflowY: "auto",
              }}
            >
            {results.map((pokemon, i) => (
                <Card
                    key={pokemon.objectID}
                    ref={(el) => { itemRefs.current[i] = el; }}
                    as="button"
                    padding={2}
                    radius={0}
                    tone={i === hoveredIndex ? "primary" : "default"}
                    style={{
                        width: "100%",
                        cursor: "pointer",
                        borderBottom: "1px solid var(--card-border-color)",
                    }}
                    onClick={() => handleSelect(pokemon)}
                    onMouseEnter={() => setHoveredIndex(i)}
                >
                  <Flex align="center" gap={3}>
                    <img
                      src={pokemon.sprite}
                      alt={pokemon.displayName}
                      style={{ width: 44, height: 44, imageRendering: "pixelated" }}
                    />
                    <Stack space={1}>
                      <Text size={1} weight="medium">{pokemon.displayName}</Text>
                      <Flex gap={1}>
                        {pokemon.types.map((t) => (
                          <span
                            key={t}
                            style={{
                              background: TYPE_COLORS[t] ?? "#999",
                              color: "#fff",
                              borderRadius: 3,
                              padding: "1px 6px",
                              fontSize: 10,
                              fontWeight: 600,
                              textTransform: "capitalize",
                            }}
                          >
                            {t}
                          </span>
                        ))}
                      </Flex>
                    </Stack>
                  </Flex>
                </Card>
              ))}
            </Card>
          )}
        </Stack>
      )}
    </div>
  );
}