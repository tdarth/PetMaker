import { Settings } from "../SimpleConfig/index.js";

export const settings = new Settings("PetMaker")
.addMarkdown("Tutorial", FileLib.read("PetMaker", "tutorial.md"))

settings.addSwitch({
  group: "Menu",
  name: "Add Bolding to <Rarity>?",
  description: "When <rarity> is detected in the item description, it will add bolding.",
  category: "Toggles",
  varname: "addBolding",
  placeholder: true
});

function updateRarityColors() {
  const rarityInput = settings.rarityNames || "";
  const rarityArray = rarityInput.split(",").map(rarity => rarity.trim()).filter(rarity => rarity.length > 0);

  settings.rarityColors = settings.rarityColors || [];

  settings.rarityColors = rarityArray.map((_, index) => 
    (settings.rarityColors[index] || "&f&l").replaceAll("&", "§")
  );

  settings.module.data.categories["Configuration"] = {};

  rarityArray.forEach((rarity, index) => {
    settings.addMinecraftColor({
      group: "Configuration",
      name: `${rarity} Color`,
      description: `Pick a color for the ${rarity} rarity.`,
      category: "Edit Colors",
      varname: `rc${index}`,
    });
  });
}

settings.addTextInput({
  group: "Menu",
  title: "Rarities",
  description: "The rarities you want to use. Separate with a comma.",
  category: "Colors & Rarity",
  placeholder: "COMMON, UNCOMMON, RARE, EPIC, LEGENDARY, DIVINE",
  varname: "rarityNames"
});

settings.registerListener("rarityNames", (oldValue, newValue) => {
  updateRarityColors();
});

updateRarityColors();

settings.command("petmaker", ["pm"]);