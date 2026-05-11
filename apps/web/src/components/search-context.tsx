"use client";

import { createContext, useContext } from "react";

type SearchData = {
    allCategories: { title: string; slug: string }[];
    allAuthors: { name: string; slug: string }[];
};

const SearchContext = createContext<SearchData>({
    allCategories: [],
    allAuthors: [],
});

export function SearchProvider({
    children,
    allCategories,
    allAuthors,
}: SearchData & { children: React.ReactNode }) {
    return (
        <SearchContext.Provider value={{ allCategories, allAuthors }}>
            {children}
        </SearchContext.Provider>
    );
}

export const useSearchData = () => useContext(SearchContext);