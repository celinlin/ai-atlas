export interface MapPalette {
  ocean: string;
  land: string;
  border: string;
  graticule: string;
  steps: [string, string, string, string, string];
  selected: string;
  outline: string;
  hover: string;
  dot: string;
  dotStroke: string;
}

export const LIGHT: MapPalette = {
  ocean: "#f8f8f5",
  land: "#e5e6e0",
  border: "#ffffff",
  graticule: "rgba(23,26,33,0.06)",
  steps: ["#dbe3fd", "#b7c6fa", "#8aa2f7", "#5d7ef6", "#365cf5"],
  selected: "#171a21",
  outline: "#171a21",
  hover: "#171a21",
  dot: "#365cf5",
  dotStroke: "#ffffff",
};

export const DARK: MapPalette = {
  ocean: "#0d0f13",
  land: "#1c2028",
  border: "#0d0f13",
  graticule: "rgba(236,238,241,0.05)",
  steps: ["#1e2850", "#283b7c", "#3753ab", "#4f6fde", "#7894ff"],
  selected: "#eceef1",
  outline: "#eceef1",
  hover: "#eceef1",
  dot: "#7894ff",
  dotStroke: "#0d0f13",
};

/** Activity level 1..5 on a log scale relative to the busiest country. */
export function activityLevel(count: number, max: number): number {
  if (count <= 0) return 0;
  if (max <= 1) return 3;
  return Math.max(1, Math.min(5, 1 + Math.round((4 * Math.log(count)) / Math.log(max))));
}
