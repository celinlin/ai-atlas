export const NEWS_VIEWS = ["forYou", "top", "latest", "byCountry", "byIndustry", "trending", "following"] as const;
export type NewsView = (typeof NEWS_VIEWS)[number];
