export interface ItemDefinition {
  display: string;
  sellValue: number;
  huntWeight: number;
  shinyVariant?: string;
}

export const itemDefinitions: Record<string, ItemDefinition> = {
  fish: { display: "Fish", sellValue: 10, huntWeight: 30, shinyVariant: "shiny fish" },
  fox: { display: "Fox", sellValue: 60, huntWeight: 25, shinyVariant: "shiny fox" },
  bunny: { display: "Bunny", sellValue: 80, huntWeight: 20, shinyVariant: "shiny bunny" },
  dragon: { display: "Dragon", sellValue: 420, huntWeight: 15, shinyVariant: "shiny dragon" },
  cloud: { display: "Cloud", sellValue: 260, huntWeight: 10, shinyVariant: "shiny cloud" },
  "shiny fish": { display: "✨ Shiny Fish", sellValue: 120, huntWeight: 0 },
  "shiny fox": { display: "✨ Shiny Fox", sellValue: 420, huntWeight: 0 },
  "shiny bunny": { display: "✨ Shiny Bunny", sellValue: 520, huntWeight: 0 },
  "shiny dragon": { display: "✨ Shiny Dragon", sellValue: 2500, huntWeight: 0 },
  "shiny cloud": { display: "✨ Shiny Cloud", sellValue: 1800, huntWeight: 0 },
};

export const huntItems = ["fish", "fox", "bunny", "dragon", "cloud"] as const;

export const itemChoices = Object.entries(itemDefinitions).map(([value, def]) => ({
  name: def.display,
  value,
}));

export function getItemDisplayName(itemKey: string) {
  return itemDefinitions[itemKey]?.display ?? itemKey;
}

export function getItemSellValue(itemKey: string) {
  return itemDefinitions[itemKey]?.sellValue ?? 0;
}

export function getRandomHuntItem() {
  const expanded = huntItems.flatMap((item) => Array(itemDefinitions[item].huntWeight).fill(item));
  const index = Math.floor(Math.random() * expanded.length);
  return expanded[index];
}

export function isValidItem(itemKey: string) {
  return Boolean(itemDefinitions[itemKey]);
}

export function getShinyVariant(itemKey: string) {
  return itemDefinitions[itemKey]?.shinyVariant ?? null;
}
