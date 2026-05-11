import { algoliasearch } from "algoliasearch";

const searchClient = algoliasearch(
  process.env.NEXT_PUBLIC_ALGOLIA_APP_ID!,
  process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY!
);

const TYPE_COLORS: Record<string, string> = {
  fire: "#F08030", water: "#6890F0", grass: "#78C850",
  electric: "#F8D030", psychic: "#F85888", ice: "#98D8D8",
  dragon: "#7038F8", dark: "#705848", fairy: "#EE99AC",
  normal: "#A8A878", fighting: "#C03028", flying: "#A890F0",
  poison: "#A040A0", ground: "#E0C068", rock: "#B8A038",
  bug: "#A8B820", ghost: "#705898", steel: "#B8B8D0",
};

type PokemonData = {
  name: string;
  displayName: string;
  sprite: string;
  types: string[];
  id: number;
};

async function fetchPokemonFromAlgolia(name: string): Promise<PokemonData | null> {
  try {
    const res = await searchClient.searchSingleIndex<PokemonData>({
      indexName: "pokemon",
      searchParams: { query: name, hitsPerPage: 1 },
    });
    return res.hits[0] ?? null;
  } catch {
    return null;
  }
}

export async function PokemonCard({ name }: { name: string }) {
  const pokemon = await fetchPokemonFromAlgolia(name);
  if (!pokemon) return null;

  return (
    <div className="relative flex items-center justify-center p-2">
      <div>
        {pokemon.displayName}
        <div className="flex gap-1.5">
          {pokemon.types.map((t) => (
            <span
              key={t}
              className="rounded px-2 py-0.5 text-xs font-semibold text-white capitalize"
              style={{ background: TYPE_COLORS[t] ?? "#999" }}
            >
              {t}
            </span>
          ))}
        </div>
        
      </div>
      <span className="w-20 h-px bg-foreground ml-5"></span>
      <img
        src={pokemon.sprite}
        alt={pokemon.displayName}
        className="drop-shadow-md"
        style={{ imageRendering: "pixelated", width: 120, height: 120 }}
        />
    </div>
  );
}

// <div className="not-prose mb-8 inline-flex items-center gap-4 rounded-xl border border-border bg-muted/40 px-4 py-3">
//   <img
//     src={pokemon.sprite}
//     alt={pokemon.displayName}
//     width={20}
//     height={20}
//     className="drop-shadow-md"
//     style={{ imageRendering: "pixelated" }}
//   />
//   <div className="flex flex-col gap-1.5">
//     <div className="flex items-center gap-2">
//       <span className="text-xs text-muted-foreground font-mono">
//         #{String(pokemon.id).padStart(3, "0")}
//       </span>
//       <span className="font-semibold text-base">{pokemon.displayName}</span>
//     </div>
//     <div className="flex gap-1.5">
//       {pokemon.types.map((t) => (
//         <span
//           key={t}
//           className="rounded px-2 py-0.5 text-xs font-semibold text-white capitalize"
//           style={{ background: TYPE_COLORS[t] ?? "#999" }}
//         >
//           {t}
//         </span>
//       ))}
//     </div>
//   </div>
// </div>