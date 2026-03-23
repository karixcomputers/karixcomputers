import { PrismaClient } from "@prisma/client";
const prisma = new PrismaClient();

async function main() {
  await prisma.product.deleteMany();

  await prisma.product.createMany({
    data: [
      {
        name: "Budget Gamer RX 6600",
        priceCents: 349900,
        images: ["https://placehold.co/600x400"],
        description: "PC entry-level pentru 1080p.",
        cpuBrand: "AMD",
        gpuBrand: "AMD",
        ramGb: 16,
        storageGb: 1000,
        stock: 5,
        tags: ["budget", "1080p"],
      },
      {
        name: "Mid Beast RTX 4070",
        priceCents: 699900,
        images: ["https://placehold.co/600x400"],
        description: "Echilibru perfect pentru 1440p.",
        cpuBrand: "Intel",
        gpuBrand: "NVIDIA",
        ramGb: 32,
        storageGb: 2000,
        stock: 3,
        tags: ["mid", "1440p"],
      },
      {
        name: "High-End RTX 4090 Creator",
        priceCents: 1499900,
        images: ["https://placehold.co/600x400"],
        description: "Performanță maximă gaming + creator.",
        cpuBrand: "AMD",
        gpuBrand: "NVIDIA",
        ramGb: 64,
        storageGb: 4000,
        stock: 1,
        tags: ["high-end", "4k"],
      },
    ],
  });

  console.log("Seed done");
}

main().finally(() => prisma.$disconnect());
