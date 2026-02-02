export const regions: Record<string, string> = {
	"smart-global": "GeoDNS (premium)",
	global: "Global Anycast (free)",
	"north-america": "North America (premium)",
	europe: "Europe (premium)",
	asia: "Asia (premium)",
	india: "India (premium)",
	"south-america": "South America (premium)",
	"seattle-washington": "Seattle, Washington (USA premium)",
	"los-angeles-california": "Los Angeles, California (USA premium)",
	"denver-colorado": "Denver, Colorado (USA premium)",
	"dallas-texas": "Dallas, Texas (USA premium)",
	"new-york": "New York, New York (USA premium)",
	"united-kingdom": "United Kingdom (EU premium)",
	"germany": "Frankfurt, Germany (EU premium)",
	"romania": "Bucharest, Romania (EU premium)",
	"japan": "Tokyo, Japan (Asia premium)",
	"australia": "Sydney, Australia (Asia premium)",
	"chile": "Santiago, Chile (SA premium)",
}

export const regionKeys = [
	"smart-global",
	"global",
	"north-america",
	"europe",
	"asia",
	"india",
	"south-america",
	"seattle-washington",
	"los-angeles-california",
	"denver-colorado",
	"dallas-texas",
	"new-york",
	"united-kingdom",
	"germany",
	"romania",
	"japan",
	"australia",
	"chile",
] as const satisfies readonly RegionKey[];

export type RegionKey = keyof typeof regions;

export type RegionPremiumStatus = {
	[K in RegionKey]: boolean;
};

export const regionPremiumStatus: RegionPremiumStatus = {
	"smart-global": true,
	global: false,
	"north-america": true,
	europe: true,
	asia: true,
	india: true,
	"south-america": true,
	"seattle-washington": true,
	"los-angeles-california": true,
	"denver-colorado": true,
	"dallas-texas": true,
	"new-york": true,
	"united-kingdom": true,
	"germany": true,
	"romania": true,
	"japan": true,
	"australia": true,
	"chile": true,
} as const;

/**
 * Check if a region is premium.
 * @param region - The region key to check
 * @returns true if the region is premium, false otherwise
 */
export function isPremiumRegion(region: RegionKey): boolean {
	return regionPremiumStatus[region] ?? false;
}

/**
 * Get all premium region keys.
 */
export function getPremiumRegions(): RegionKey[] {
	return (Object.keys(regionPremiumStatus) as RegionKey[]).filter(
		(key) => regionPremiumStatus[key] === true
	);
}

/**
 * Get all free (non-premium) region keys.
 */
export function getFreeRegions(): RegionKey[] {
	return (Object.keys(regionPremiumStatus) as RegionKey[]).filter(
		(key) => regionPremiumStatus[key] === false
	);
}

/**
 * Type representing only premium region keys.
 */
export type PremiumRegionKey = {
	[K in RegionKey]: typeof regionPremiumStatus[K] extends true ? K : never;
}[RegionKey];

/**
 * Type representing only free (non-premium) region keys.
 */
export type FreeRegionKey = {
	[K in RegionKey]: typeof regionPremiumStatus[K] extends false ? K : never;
}[RegionKey];