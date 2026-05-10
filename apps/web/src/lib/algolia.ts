import { algoliasearch } from "algoliasearch";

export const ALGOLIA_INDEX = "blog_posts";

export const getAlgoliaAdminClient = () => {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const adminKey = process.env.ALGOLIA_ADMIN_KEY;
  if (!appId || !adminKey) throw new Error("Missing Algolia admin credentials");
  return algoliasearch(appId, adminKey);
};

export const getAlgoliaSearchClient = () => {
  const appId = process.env.NEXT_PUBLIC_ALGOLIA_APP_ID;
  const searchKey = process.env.NEXT_PUBLIC_ALGOLIA_SEARCH_KEY;
  if (!appId || !searchKey) throw new Error("Missing Algolia search credentials");
  return algoliasearch(appId, searchKey);
};