import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

type SeedItem = {
  name: string;
  reorderLink?: string | null;
  categoryId?: string | null;
};

// Items interpreted from "Inventory Tracking List.xlsx" (Uline sheet: Item, Last Order, Price, Order Frequency, Link)
const EXCEL_ITEMS: SeedItem[] = [
  { name: "Drink Carrier" },
  { name: "8oz Hot Cup" },
  { name: "8oz Hot Lid" },
  { name: "4oz Hot Cup" },
  { name: "4oz Hot Lid" },
  { name: "Shipping Boxes" },
  { name: "12oz Coffee Bag" },
  { name: "1lb Coffee Bag" },
];

// Items from "Inventory Tracking List.xlsx" – Amazon tab
const AMAZON_CATEGORY_ID = "seed-amazon";
const AMAZON_ITEMS: SeedItem[] = [
  { name: "Dawn Dish Soap", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Sponges", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "White Trash Bags", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Vacuum Filters", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Magic Eraser", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Roach Bait", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: 'Air Filter (13.25")', reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Milk Jugs", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Water Glasses", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Cortado Glasses", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Paper Towel", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Toliet Paper", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Stamp Ink", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Seltzer Charger", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Umbrella", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Rubbing Alcohol", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Glass Cleaner", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Masking Tape", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Ant Bait", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Black Trash Bag", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Pastry Paper", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
  { name: "Chamois", reorderLink: null, categoryId: AMAZON_CATEGORY_ID },
];

// Items from "Inventory Tracking List.xlsx" – Espresso Parts tab
const ESPRESSO_PARTS_CATEGORY_ID = "seed-espresso-parts";
const ESPRESSO_PARTS_ITEMS: SeedItem[] = [
  { name: "Cold Brew Paper Filter", reorderLink: null, categoryId: ESPRESSO_PARTS_CATEGORY_ID },
  { name: "Yama Ceramic Filter", reorderLink: null, categoryId: ESPRESSO_PARTS_CATEGORY_ID },
  { name: "Yama Middle Beaker", reorderLink: null, categoryId: ESPRESSO_PARTS_CATEGORY_ID },
];

// Items from "Inventory Tracking List.xlsx" – Other tab
const OTHER_CATEGORY_ID = "seed-other";
const OTHER_ITEMS: SeedItem[] = [
  {
    name: "Water Filter (Voltage Coffee Supply)",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Mountain Valley Water - Still",
    reorderLink: "Call (561) 582-1367",
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Mountain Valley Water - Sparkling",
    reorderLink: "Call (561) 582-1367",
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Evian Water - Plastic 1L",
    reorderLink: "Call (561) 582-1367",
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Evian Water - Glass 750ml",
    reorderLink: "Call (561) 582-1367",
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Sprouted Cashew",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Coconut Flakes",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Coca-Cola",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Topo Chico",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Plastic Cold Cups",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Plastic Cold Lids",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Drink carriers",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Straws",
    reorderLink: "Text (561) 504-7167",
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Dates",
    reorderLink: "Email Rancho Meladuco",
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Raw Coffee",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Greenwise Whole Milk - 1 Gallon",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Greenwise Whole Milk - 0.5 Gallon",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
  {
    name: "Organic Cane Sugar",
    reorderLink: null,
    categoryId: OTHER_CATEGORY_ID,
  },
];

async function main() {
  const adminHash = await bcrypt.hash("admin123", 10);
  const admin = await prisma.user.upsert({
    where: { email: "admin@example.com" },
    update: {},
    create: {
      email: "admin@example.com",
      passwordHash: adminHash,
      role: "admin",
    },
  });
  console.log("Admin user:", admin.email, "| password: admin123");

  const staffHash = await bcrypt.hash("staff123", 10);
  const staff = await prisma.user.upsert({
    where: { email: "staff@example.com" },
    update: {},
    create: {
      email: "staff@example.com",
      passwordHash: staffHash,
      role: "staff",
    },
  });
  console.log("Staff user:", staff.email, "| password: staff123");

  const managerHash = await bcrypt.hash("manager123", 10);
  const manager = await prisma.user.upsert({
    where: { email: "manager@example.com" },
    update: {},
    create: {
      email: "manager@example.com",
      passwordHash: managerHash,
      role: "manager",
    },
  });
  console.log("Manager user:", manager.email, "| password: manager123");

  const locations = ["Shop", "Storage unit"];
  const locationIds: string[] = [];
  for (const name of locations) {
    const id = name === "Shop" ? "seed-shop" : "seed-storage";
    await prisma.location.upsert({
      where: { id },
      update: { name },
      create: { id, name },
    });
    locationIds.push(id);
  }
  console.log("Locations: Shop, Storage unit");

  // Seed categories used by inventory items
  const categorySeeds = [
    { id: AMAZON_CATEGORY_ID, name: "amazon" },
    { id: ESPRESSO_PARTS_CATEGORY_ID, name: "espresso parts" },
    { id: OTHER_CATEGORY_ID, name: "other" },
  ];
  for (const cat of categorySeeds) {
    await prisma.category.upsert({
      where: { id: cat.id },
      update: { name: cat.name },
      create: { id: cat.id, name: cat.name },
    });
  }
  console.log(
    "Categories:",
    categorySeeds.map((c) => c.name).join(", ")
  );

  const allItems: SeedItem[] = [
    ...EXCEL_ITEMS,
    ...AMAZON_ITEMS,
    ...ESPRESSO_PARTS_ITEMS,
    ...OTHER_ITEMS,
  ];

  for (const row of allItems) {
    const existing = await prisma.inventoryItem.findFirst({ where: { name: row.name } });
    if (existing) continue;
    const item = await prisma.inventoryItem.create({
      data: {
        name: row.name,
        reorderLink: row.reorderLink ?? null,
        categoryId: row.categoryId ?? null,
      },
    });
    for (const locationId of locationIds) {
      await prisma.itemLocationQuantity.create({
        data: { itemId: item.id, locationId, quantity: 0, quantityInUse: 0 },
      });
    }
    console.log("Created item:", item.name);
  }
  console.log("Inventory items from Excel list:", EXCEL_ITEMS.length);
}

main()
  .then(() => prisma.$disconnect())
  .catch((e) => {
    console.error(e);
    prisma.$disconnect();
    process.exit(1);
  });
