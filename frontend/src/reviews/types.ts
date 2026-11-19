export type Review = {
  id: string; author: string; source: string; rating: number; quote: string; full: string;
  conditions: string[]; label: string;
}
export type ReviewTopic = {
  id: string; label: string; title: string; description: string;
  reviews: [Review, Review]; comparison: { label: string; a: string; b: string }[];
  takeaway: string; unknown: string;
}
export type ReviewScenario = {
  id: 'headphones' | 'cafe'; tab: string; name: string; category: string; description: string;
  options: string[]; topics: ReviewTopic[];
}
export type ReviewDemo = { scenarios: ReviewScenario[] }
