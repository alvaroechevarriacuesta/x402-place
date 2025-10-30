import 'dotenv/config';
import { prisma } from '../packages/shared/lib/db';

const GRID_WIDTH = 1000;
const GRID_HEIGHT = 1000;
const DEFAULT_COLOR = '#FFFFFF';
const BATCH_SIZE = 1000;

async function seedPixels() {
  console.log(`Starting to seed ${GRID_WIDTH}x${GRID_HEIGHT} pixels...`);

  const startTime = Date.now();
  let totalInserted = 0;

  try {
    // Generate all pixels
    const pixels = [];
    for (let y = 0; y < GRID_HEIGHT; y++) {
      for (let x = 0; x < GRID_WIDTH; x++) {
        pixels.push({
          x,
          y,
          color: DEFAULT_COLOR,
        });
      }
    }

    console.log(`Generated ${pixels.length} pixel records`);

    // Insert in batches to avoid overwhelming the database
    for (let i = 0; i < pixels.length; i += BATCH_SIZE) {
      const batch = pixels.slice(i, i + BATCH_SIZE);

      await prisma.pixel.createMany({
        data: batch,
        skipDuplicates: true, // Skip if pixel already exists
      });

      totalInserted += batch.length;

      if (totalInserted % 10000 === 0) {
        console.log(`Inserted ${totalInserted}/${pixels.length} pixels...`);
      }
    }

    const endTime = Date.now();
    const duration = ((endTime - startTime) / 1000).toFixed(2);

    console.log(
      `✅ Successfully seeded ${totalInserted} pixels in ${duration}s`
    );
  } catch (error) {
    console.error('❌ Error seeding pixels:', error);
    throw error;
  } finally {
    await prisma.$disconnect();
  }
}

seedPixels().catch(error => {
  console.error(error);
  process.exit(1);
});