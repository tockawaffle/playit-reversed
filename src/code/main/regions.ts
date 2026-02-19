export const premiumRegions = [{
	region: "australia" as const,
	name: "sydney-1" as const,
	regionTitle: "Sydney, Australia" as const,
}, {
	region: "chile" as const,
	name: "santiago-1" as const,
	regionTitle: "Chile, South America" as const,
}, {
	region: "south-america" as const,
	name: "sao-paulo-1" as const,
	regionTitle: "Brazil, South America" as const,
}, {
	region: "india" as const,
	name: "mumbai-2" as const,
	regionTitle: "Mumbai, India" as const,
}, {
	region: "india" as const,
	name: "delhi-1" as const,
	regionTitle: "New Delhi, India" as const,
}, {
	region: "india" as const,
	name: "bangalore-1" as const,
	regionTitle: "Bangalore, India" as const,
}, {
	region: "asia" as const,
	name: "singapore-1" as const,
	regionTitle: "Singapore" as const,
}, {
	region: "japan" as const,
	name: "tokyo-1" as const,
	regionTitle: "Japan" as const,
}, {
	region: "germany" as const,
	name: "frankfurt-2" as const,
	regionTitle: "Germany, Europe" as const,
}, {
	region: "europe" as const,
	name: "madrid-2" as const,
	regionTitle: "Spain, Europe" as const,
}, {
	region: "united-kingdom" as const,
	name: "london-2" as const,
	regionTitle: "United Kingdom, Europe" as const,
}, {
	region: "romania" as const,
	name: "bucharest-1" as const,
	regionTitle: "Romania, Europe" as const,
}, {
	region: "seattle-washington" as const,
	name: "seattle-2" as const,
	regionTitle: "Seattle, Washington USA" as const,
}, {
	region: "los-angeles-california" as const,
	name: "los-angeles-2" as const,
	regionTitle: "Los Angeles, California USA" as const,
}, {
	region: "new-york" as const,
	name: "new-york-2" as const,
	regionTitle: "NYC, New York USA" as const,
}, {
	region: "denver-colorado" as const,
	name: "denver-1" as const,
	regionTitle: "Denver, Colorado USA" as const,
}, {
	region: "dallas-texas" as const,
	name: "dallas-3" as const,
	regionTitle: "Dallas, Texas USA" as const,
}, {
	region: "north-america" as const,
	name: "miami-3" as const,
	regionTitle: "Miami, Florida USA" as const,
}, {
	region: "chicago-illinois" as const,
	name: "chicago-2" as const,
	regionTitle: "Chicago, Illinois USA" as const,
}, {
	region: "poland" as const,
	name: "warsaw-1" as const,
	regionTitle: "Poland, Europe" as const,
}, {
	region: "sweden" as const,
	name: "stockholm-2" as const,
	regionTitle: "Sweden, Europe" as const,
}]

export const premiumRegionsMap = new Map(premiumRegions.map(region => [region.region, region]));
export type PremiumRegion = typeof premiumRegions[number];
export type PremiumRegionKey = keyof typeof premiumRegionsMap;