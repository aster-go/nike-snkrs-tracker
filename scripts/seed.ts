import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Nike SNKRS Tracker database...");

  const drops = [
    {
      sku: "DM7866-140",
      styleCode: "DM7866-140",
      title: "Travis Scott x Air Jordan 1 Low OG",
      subtitle: "Reverse Mocha",
      description: "Celebrating Travis Scott's signature reverse swoosh and earthy color palette with premium nubuck and leather overlays.",
      colorway: "Sail / University Red / Ridgerock",
      imageUrl: "https://images.unsplash.com/photo-1552346154-21d32810aba3?w=800&auto=format&fit=crop&q=80",
      retailPrice: 5800,
      currency: "THB",
      estimatedResell: 38000,
      snkrsUrl: "https://www.nike.com/th/launch/t/travis-scott-aj1-low-reverse-mocha",
      region: "TH",
      launchType: "DAN",
      launchDate: new Date(Date.now() + 86400000 * 2),
      status: "UPCOMING",
    },
    {
      sku: "FQ3545-100",
      styleCode: "FQ3545-100",
      title: "Kobe 8 Protro",
      subtitle: "Halo / Triple White",
      description: "Engineered with updated Nike React foam and classic engineered mesh for maximum court responsiveness.",
      colorway: "White / White / White",
      imageUrl: "https://images.unsplash.com/photo-1595950653106-6c9ebd614d3a?w=800&auto=format&fit=crop&q=80",
      retailPrice: 6500,
      currency: "THB",
      estimatedResell: 14500,
      snkrsUrl: "https://www.nike.com/th/launch/t/kobe-8-protro-halo",
      region: "TH",
      launchType: "LEO",
      launchDate: new Date(Date.now() + 86400000 * 4),
      status: "UPCOMING",
    },
  ];

  for (const drop of drops) {
    await prisma.sneaker.upsert({
      where: { sku: drop.sku },
      update: drop,
      create: drop,
    });
  }

  console.log("✅ Seed completed successfully!");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
