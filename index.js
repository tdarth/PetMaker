/// <reference types="../CTAutocomplete" />

import loadItemstack from "./utils/loadItemstack";
import getItemFromNBT from "./utils/getItemFromNBT";

import { settings } from "./config.js";

const chatPrefix = "&8[&e&lPet&fMaker&8]";

const GuiChest = Java.type('net.minecraft.client.gui.inventory.GuiChest');
const GuiInventory = Java.type('net.minecraft.client.gui.inventory.GuiContainerCreative');

let isGuiOpen = false;
let guiX = 0, guiY = 0;
let selectedOption = null;

let originalStackSizes = new Map();

let selectedItemNBT = null;

register("guiMouseClick", (x, y, button, gui, event) => {
  if (button == 2) {
    if (gui instanceof GuiChest) {
      container = Player.getContainer().getName();
      if (!container.includes("Rewards") && !container.includes("Filter") && !container.includes("Pack")) return;
    } else if (!(gui instanceof GuiInventory) && !(gui instanceof GuiChest)) return;

    cancel(event);
    if (!settings.rarityNames) return ChatLib.chat(`${chatPrefix} &c&lError: &fRarity Names &fare &cnot defined &fin &8Settings.`);
    if (Player.asPlayerMP().player.field_71075_bZ.field_75098_d === false) return ChatLib.chat(`${chatPrefix} &c&lError: &fYou must be in &aCreative&f mode.`);

    let slot = Client.currentGui.getSlotUnderMouse();
    if (!slot || !slot.getItem()) return;

    isGuiOpen = true;
    guiX = x + 5;
    guiY = y + 5;

    selectedItemNBT = slot.getItem().getNBT();

    Player.getContainer().getItems().forEach((item, index) => {
      if (!item) return;

      if (!originalStackSizes.has(index)) {
        originalStackSizes.set(index, item.getStackSize());
      }

      item.setStackSize(1);
    });
  } else {
    if (isGuiOpen) {
      cancel(event);

      originalStackSizes.forEach((stackSize, index) => {
        let item = Player.getContainer().getStackInSlot(index);
        if (item) item.setStackSize(stackSize);
      });
      originalStackSizes.clear();
    }
  }

  if (!isGuiOpen) return;

  [...settings.rarityNames.split(",").map(rarity => rarity.trim()).filter(rarity => rarity.length > 0), "Config"].forEach((option, index) => {
    let optionY = guiY + 5 + index * 15;
    if (x >= guiX && x <= guiX + 100 && y >= optionY && y <= optionY + 10) {
      selectedOption = option;

      if (selectedOption === "Config") return (ChatLib.command("petmaker", true), isGuiOpen = false);

      let nbtData = FileLib.read("PetMaker", "nbt.json");
      if (!nbtData) return ChatLib.chat(`${chatPrefix} &c&lError: &fFailed to &7read data&f from &cnbt.json.`);

      let parsedNBT = JSON.parse(nbtData);

      let rarity = selectedOption;
      let rarityIndex = settings.rarityNames.split(",").map(rarity => rarity.trim()).filter(rarity => rarity.length > 0).indexOf(rarity);

      let rawRarityColor = settings[`rc${rarityIndex}`] || "";
      let rarityColor = rawRarityColor.split("").map(char => `§${char}`).join("");
      let boldedRarityColor = settings.addBolding ? rarityColor + "§l" : rarityColor;

      let selectedItemNBTString = selectedItemNBT.toString();
      let selectedItemName = selectedItemNBTString.match(/Name:"(.*?)"/)?.[1].removeFormatting() || "Unknown Item";

      let newName = parsedNBT.name
        .replace(/<rarity>/g, `${boldedRarityColor}${rarity}`)
        .replace(/<raritycolor>/g, rarityColor)
        .replace(/<pet>/g, selectedItemName);

      let newLore = parsedNBT.lore.map(line =>
        line
          .replace(/<rarity>/g, `${boldedRarityColor}${rarity}`)
          .replace(/<raritycolor>/g, rarityColor)
          .replace(/<pet>/g, selectedItemName)
      );

      newName = newName.replace(/<(\d+)-(\d+)>/g, (match, min, max) => {
        return Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
      });

      newLore = newLore.map(line =>
        line.replace(/<(\d+)-(\d+)>/g, (match, min, max) => {
          return Math.floor(Math.random() * (parseInt(max) - parseInt(min) + 1)) + parseInt(min);
        })
      );

      let formattedLore = newLore.map(line => `"${line}"`).join(",");

      let nbtString = selectedItemNBT.toString();

      if (!/display:\{/.test(nbtString)) {
        nbtString = nbtString.replace(/tag:\{/, `tag:{display:{},`);
      }

      nbtString = nbtString.replace(/Name:"(.*?)"/, `Name:"${newName}"`);

      if (/Lore:\[.*?\]/.test(nbtString)) {
        nbtString = nbtString.replace(/Lore:\[.*?\]/, `Lore:[${formattedLore}]`);
      } else {
        nbtString = nbtString.replace(/display:\{/, `display:{Lore:[${formattedLore}],`);
      }

      let modifiedItem = getItemFromNBT(nbtString).itemStack;

      let foundSlot = false;

      for (let i = 9; i < 36; i++) {
        if (!Player.getInventory().getItems()[i]) {
          loadItemstack(modifiedItem, i);
          foundSlot = true;
          break;
        }
      }

      if (!foundSlot) ChatLib.chat(`${chatPrefix} &c&lError: &fNo &7open slot &ffound to give item.`);
      else foundSlot = false;

      setTimeout(() => { isGuiOpen = false; }, 100);
    }
  });
});

register("guiRender", () => {
  if (!isGuiOpen) return;

  Renderer.translate(0, 0, 300);
  Renderer.drawRect(Renderer.color(0, 0, 0, 150), guiX, guiY, 100, [...settings.rarityNames.split(",").map(rarity => rarity.trim()).filter(rarity => rarity.length > 0), "Config"].length * 15 + 5);

  [...settings.rarityNames.split(",").map(rarity => rarity.trim()).filter(rarity => rarity.length > 0), "Config"].forEach((option, index) => {
    let optionY = guiY + 5 + index * 15;

    let rawRarityColor = settings[`rc${index}`] || "";
    let rarityColor = rawRarityColor.split("").map(char => `§${char}`).join("");
    if (settings.addBolding) {
      rarityColor += "§l";
    }

    if (option !== "Config") option = `${rarityColor + option}`;
    else option = `&8[Config]`;
    Renderer.translate(0, 0, 301);
    Renderer.drawString(option, guiX + 5, optionY);
  });
});

register("renderSlotHighlight", (x, y, slot, gui, event) => {
  if (isGuiOpen) cancel(event);
});
register("itemTooltip", (lore, item, event) => {
  if (isGuiOpen) cancel(event);
});

register("command", () => {
  try {
    let heldItem = Player.getHeldItem();
    if (!heldItem) return ChatLib.chat(`${chatPrefix} &c&lError: &fYou must hold an &bitem&f. Type &6&l/petmaker&f for a &atutorial&f.`);

    let nbtString = heldItem.getNBT()?.toString();
    if (!nbtString) return ChatLib.chat(`${chatPrefix} &c&lError: &fFailed to get &7NBT data&f from the item.`);

    let nameMatch = nbtString.match(/Name:"(.*?)"/);
    let itemName = nameMatch ? nameMatch[1] : "Unknown Item";

    let loreMatch = nbtString.match(/Lore:\[(.*?)\]/);
    let loreArray = loreMatch
      ? loreMatch[1]
        .split(",")
        .map(line => line.replace(/^\d+:\"|\"$/g, "").trim())
      : [];

    let itemData = {
      "name": itemName,
      "lore": loreArray,
      "nbt": nbtString,
    };

    FileLib.write("PetMaker", "nbt.json", JSON.stringify(itemData, null, 2), true);
    ChatLib.chat(`${chatPrefix} &a&lSuccess! &fSaved &dpet data&f.`);
  } catch (error) {
    ChatLib.chat(`${chatPrefix} &c&lError: &fAn unexpected error occurred in &6&l/savepet&f.`);
    console.error(error);
  }
}).setName("savepet").setAliases("petsave", "sp");

register("command", () => {
  if (Player.asPlayerMP().player.field_71075_bZ.field_75098_d === false) return ChatLib.chat(`${chatPrefix} &c&lError: &fYou must be in &aCreative&f mode.`);
  try {
    let nbtData = FileLib.read("PetMaker", "nbt.json");
    if (!nbtData) return ChatLib.chat(`${chatPrefix} &c&lError: &fNo saved data found. Please use &6/savepet&f.`);

    let parsedData = JSON.parse(nbtData);
    if (!parsedData.nbt) return ChatLib.chat(`${chatPrefix} &c&lError: &fInvalid data in &7nbt.json&f.`);

    let modifiedItem = getItemFromNBT(parsedData.nbt)?.itemStack;
    if (!modifiedItem) return ChatLib.chat(`${chatPrefix} &c&lError: &fFailed to create item from NBT data.`);

    loadItemstack(modifiedItem, Player.getHeldItemIndex() + 36);
  } catch (error) {
    ChatLib.chat(`${chatPrefix} &c&lError: &fAn unexpected error occurred in &6&l/getpet&f.`);
    console.error(error);
  }
}).setName("getpet").setAliases("petget", "gp");

// why is simpleconfig relying on an api to fetch module images anyways?
const File = Java.type("java.io.File");
const ImageIO = Java.type("javax.imageio.ImageIO");
const Files = Java.type("java.nio.file.Files");
const Paths = Java.type("java.nio.file.Paths");
const StandardCopyOption = Java.type("java.nio.file.StandardCopyOption");

const modulesFolder = new File("./config/ChatTriggers/modules");
const sourceFile = new File(modulesFolder, "PetMaker/assets/PetMaker.png");
const destFile = new File(modulesFolder, "SimpleConfig/assets/PetMaker.png");

if (destFile.exists()) {
  const destImg = ImageIO.read(destFile);
  if (destImg && destImg.getWidth() === 200 && destImg.getHeight() === 200) {
    Files.copy(
      Paths.get(sourceFile.getAbsolutePath()),
      Paths.get(destFile.getAbsolutePath()),
      StandardCopyOption.REPLACE_EXISTING
    );
  } else {
  }
} else {
  Files.copy(
    Paths.get(sourceFile.getAbsolutePath()),
    Paths.get(destFile.getAbsolutePath()),
    StandardCopyOption.REPLACE_EXISTING
  );
}

ChatLib.chat(`\n${chatPrefix} &7by &btdarth &a&lloaded. &7(/petmaker).\n`);