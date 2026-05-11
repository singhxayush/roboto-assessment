import { type NextRequest, NextResponse } from "next/server";
import { getAlgoliaAdminClient } from "@/lib/algolia";

const POKEMON_INDEX = "pokemon";
const TOTAL_POKEMON = 1025; // Gen 1 only — enough for the assignment, clean dataset

type PokemonAPIResponse = {
    id: number;
    name: string;
    sprites: {
        front_default: string;
        other: {
            "official-artwork": {
                front_default: string;
            };
        };
    };
    types: { type: { name: string } }[];
};

async function fetchPokemon(nameOrId: string | number): Promise<PokemonAPIResponse> {
    const res = await fetch(`https://pokeapi.co/api/v2/pokemon/${nameOrId}`);
    if (!res.ok) throw new Error(`Failed to fetch pokemon ${nameOrId}`);
    return res.json();
}

async function syncPokemonToAlgolia() {
    const algolia = getAlgoliaAdminClient();

    // Configure the pokemon index
    await algolia.setSettings({
        indexName: POKEMON_INDEX,
        indexSettings: {
            searchableAttributes: ["displayName", "name", "types"],
            attributesForFaceting: ["types"],
        },
    });

    // Fetch all pokemon in batches of 20
    const ids = Array.from({ length: TOTAL_POKEMON }, (_, i) => i + 1);
    const batchSize = 20;
    const records = [];

    for (let i = 0; i < ids.length; i += batchSize) {
        const batch = ids.slice(i, i + batchSize);
        const results = await Promise.all(batch.map(fetchPokemon));

        for (const p of results) {
            records.push({
                objectID: String(p.id),
                id: p.id,
                name: p.name,
                displayName: p.name.charAt(0).toUpperCase() + p.name.slice(1),
                sprite: p.sprites.other["official-artwork"].front_default ?? p.sprites.front_default,
                types: p.types.map((t) => t.type.name),
            });
        }

        // Small delay between batches to be nice to PokéAPI
        if (i + batchSize < ids.length) {
            await new Promise((r) => setTimeout(r, 300));
        }
    }

    await algolia.saveObjects({
        indexName: POKEMON_INDEX,
        objects: records,
    });

    return { message: `Indexed ${records.length} Pokémon` };
}

export async function GET(_req: NextRequest) {
    try {
        const result = await syncPokemonToAlgolia();
        return NextResponse.json(result);
    } catch (error) {
        console.error("Pokemon sync error:", error);
        return NextResponse.json({ error: "Sync failed" }, { status: 500 });
    }
}