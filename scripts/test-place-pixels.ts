/**
 * Test Pixel Placement Script
 *
 * This script places pixels via the backend API for testing purposes.
 * Pixels are placed in visible patterns so you can easily see them on the canvas.
 *
 * Usage:
 *   pnpm test:pixels [pattern]
 *
 * Available patterns:
 *   - smiley   : Draws a smiley face at (100, 100) [default]
 *   - square   : Draws a 20x20 blue square at (200, 200)
 *   - gradient : Draws a rainbow gradient at (150, 150)
 *   - text     : Draws "HI" text at (300, 300)
 *   - hello    : Draws "Hello rsproule!!" in big black letters in the bottom half
 *
 * Examples:
 *   pnpm test:pixels smiley
 *   pnpm test:pixels square
 *   pnpm test:pixels hello
 *   BASE_URL=https://your-backend.railway.app pnpm test:pixels gradient
 *
 * Environment Variables:
 *   BASE_URL - Backend server URL (default: http://localhost:3001)
 */

import 'dotenv/config';

const BASE_URL = process.env.BASE_URL || 'http://localhost:3001';
const DELAY_MS = 50; // Delay between pixel placements to avoid overwhelming the server

interface Pixel {
  x: number;
  y: number;
  color: string;
}

async function placePixel(x: number, y: number, color: string): Promise<void> {
  try {
    const response = await fetch(`${BASE_URL}/api/place`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ x, y, color }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Failed to place pixel: ${JSON.stringify(error)}`);
    }

    const result = await response.json();
    console.log(`✓ Placed pixel at (${x}, ${y}) with color ${color}`);
  } catch (error) {
    console.error(`✗ Error placing pixel at (${x}, ${y}):`, error);
    throw error;
  }
}

function delay(ms: number): Promise<void> {
  return new Promise(resolve => setTimeout(resolve, ms));
}

// Generate a smiley face pattern
function generateSmileyFace(startX: number, startY: number): Pixel[] {
  const pixels: Pixel[] = [];
  const yellow = '#FFFF00';
  const black = '#000000';

  // Face circle (simplified as a square for visibility)
  const faceSize = 30;
  for (let i = 0; i < faceSize; i++) {
    // Top edge
    pixels.push({ x: startX + i, y: startY, color: yellow });
    // Bottom edge
    pixels.push({ x: startX + i, y: startY + faceSize - 1, color: yellow });
    // Left edge
    pixels.push({ x: startX, y: startY + i, color: yellow });
    // Right edge
    pixels.push({ x: startX + faceSize - 1, y: startY + i, color: yellow });
  }

  // Left eye
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pixels.push({ x: startX + 8 + i, y: startY + 10 + j, color: black });
    }
  }

  // Right eye
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      pixels.push({ x: startX + 19 + i, y: startY + 10 + j, color: black });
    }
  }

  // Smile (curved)
  const smileY = startY + 20;
  for (let i = 8; i <= 22; i++) {
    const offset = Math.floor(Math.abs(i - 15) / 3);
    pixels.push({ x: startX + i, y: smileY - offset, color: black });
  }

  return pixels;
}

// Generate a simple square pattern
function generateSquare(
  startX: number,
  startY: number,
  size: number,
  color: string
): Pixel[] {
  const pixels: Pixel[] = [];

  for (let i = 0; i < size; i++) {
    for (let j = 0; j < size; j++) {
      pixels.push({ x: startX + i, y: startY + j, color });
    }
  }

  return pixels;
}

// Generate a gradient pattern
function generateGradient(startX: number, startY: number): Pixel[] {
  const pixels: Pixel[] = [];
  const colors = [
    '#FF0000',
    '#FF7F00',
    '#FFFF00',
    '#00FF00',
    '#0000FF',
    '#4B0082',
    '#9400D3',
  ];

  colors.forEach((color, index) => {
    for (let i = 0; i < 10; i++) {
      for (let j = 0; j < 5; j++) {
        pixels.push({
          x: startX + index * 10 + i,
          y: startY + j,
          color,
        });
      }
    }
  });

  return pixels;
}

// Generate text "HI"
function generateText(startX: number, startY: number): Pixel[] {
  const pixels: Pixel[] = [];
  const color = '#FF0000';

  // Letter "H"
  // Vertical left line
  for (let i = 0; i < 10; i++) {
    pixels.push({ x: startX, y: startY + i, color });
  }
  // Vertical right line
  for (let i = 0; i < 10; i++) {
    pixels.push({ x: startX + 5, y: startY + i, color });
  }
  // Horizontal middle line
  for (let i = 1; i < 5; i++) {
    pixels.push({ x: startX + i, y: startY + 5, color });
  }

  // Letter "I" (8 pixels to the right)
  const iX = startX + 13;
  // Vertical line
  for (let i = 0; i < 10; i++) {
    pixels.push({ x: iX, y: startY + i, color });
  }
  // Top horizontal
  for (let i = -1; i <= 1; i++) {
    pixels.push({ x: iX + i, y: startY, color });
  }
  // Bottom horizontal
  for (let i = -1; i <= 1; i++) {
    pixels.push({ x: iX + i, y: startY + 9, color });
  }

  return pixels;
}

// 5x7 pixel font patterns for each letter
const FONT_5X7: { [key: string]: number[][] } = {
  H: [
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
  ],
  e: [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
  ],
  l: [
    [1, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [1, 1, 1, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  o: [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 0],
  ],
  r: [
    [0, 0, 0, 0, 0],
    [0, 1, 0, 1, 1],
    [0, 1, 1, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  s: [
    [0, 0, 0, 0, 0],
    [0, 1, 1, 1, 1],
    [1, 0, 0, 0, 0],
    [0, 1, 1, 1, 0],
    [0, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [0, 0, 0, 0, 0],
  ],
  p: [
    [0, 0, 0, 0, 0],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 1],
    [1, 1, 1, 1, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
    [1, 0, 0, 0, 0],
  ],
  u: [
    [0, 0, 0, 0, 0],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [1, 0, 0, 0, 1],
    [0, 1, 1, 1, 1],
    [0, 0, 0, 0, 0],
  ],
  '!': [
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 1, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
  ' ': [
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
    [0, 0, 0, 0, 0],
  ],
};

// Generate "Hello rsproule!!" in big black letters
function generateHelloMessage(startX: number, startY: number): Pixel[] {
  const pixels: Pixel[] = [];
  const color = '#000000'; // Black
  const scale = 3; // Scale up each letter by 3x (so 5x7 becomes 15x21)
  const letterSpacing = 18; // Spacing between letters (in scaled pixels)

  const message = 'Hello rsproule!!';
  let currentX = startX;

  for (const char of message) {
    const pattern = FONT_5X7[char];

    if (pattern) {
      // Draw the letter with scaling
      for (let row = 0; row < pattern.length; row++) {
        for (let col = 0; col < pattern[row].length; col++) {
          if (pattern[row][col] === 1) {
            // Scale up by drawing a scale x scale block for each pixel
            for (let sy = 0; sy < scale; sy++) {
              for (let sx = 0; sx < scale; sx++) {
                pixels.push({
                  x: currentX + col * scale + sx,
                  y: startY + row * scale + sy,
                  color,
                });
              }
            }
          }
        }
      }
    }

    // Move to next letter position
    currentX += letterSpacing;
  }

  return pixels;
}

async function main() {
  console.log('🎨 Starting pixel placement test...');
  console.log(`📍 Target server: ${BASE_URL}`);
  console.log(`⏱️  Delay between pixels: ${DELAY_MS}ms\n`);

  try {
    // Choose pattern (you can change this)
    const pattern = process.argv[2] || 'smiley';
    let pixels: Pixel[] = [];

    switch (pattern) {
      case 'smiley':
        console.log('😊 Drawing a smiley face at (100, 100)...\n');
        pixels = generateSmileyFace(100, 100);
        break;
      case 'square':
        console.log('🟦 Drawing a 20x20 blue square at (200, 200)...\n');
        pixels = generateSquare(700, 700, 40, '#0000BB');
        break;
      case 'gradient':
        console.log('🌈 Drawing a rainbow gradient at (150, 150)...\n');
        pixels = generateGradient(100, 200);
        break;
      case 'text':
        console.log('✍️  Drawing "HI" text at (300, 300)...\n');
        pixels = generateText(300, 300);
        break;
      case 'hello':
        console.log('👋 Drawing "Hello rsproule!!" in big black letters...\n');
        // Position in bottom half of canvas (1000x1000, so bottom half is y=500-1000)
        // Center horizontally: message is ~288 pixels wide, so start at (1000-288)/2 = ~356
        pixels = generateHelloMessage(200, 700);
        break;
      default:
        console.log(
          '❌ Unknown pattern. Available: smiley, square, gradient, text, hello'
        );
        process.exit(1);
    }

    console.log(`Total pixels to place: ${pixels.length}\n`);

    // Place pixels with delay
    for (let i = 0; i < pixels.length; i++) {
      const pixel = pixels[i];
      await placePixel(pixel.x, pixel.y, pixel.color);

      if (DELAY_MS > 0) {
        await delay(DELAY_MS);
      }

      // Progress indicator
      if ((i + 1) % 10 === 0) {
        console.log(`Progress: ${i + 1}/${pixels.length} pixels placed`);
      }
    }

    console.log(`\n✅ Successfully placed all ${pixels.length} pixels!`);
    console.log('Check your canvas to see the result! 🎉');
  } catch (error) {
    console.error('\n❌ Error during pixel placement:', error);
    process.exit(1);
  }
}

main();
