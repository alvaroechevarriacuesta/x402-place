import { NextResponse, type NextRequest } from "next/server";
import { prisma } from "@/services/db/client";
import { Prisma } from "@prisma/client";

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { x, y, color } = body;

    // Input validation
    if (typeof x !== "number" || typeof y !== "number" || !Number.isInteger(x) || !Number.isInteger(y)) {
      return NextResponse.json(
        { success: false, error: "Invalid coordinates. x and y must be integers" },
        { status: 400 }
      );
    }
    const hexColorRegex = /^#?([0-9A-Fa-f]{6})$/;
    const match = color?.match(hexColorRegex);

    if (!match) {
      return NextResponse.json(
        { success: false, error: "Invalid color format. Use #RRGGBB or RRGGBB" },
        { status: 400 }
      );
    }

    // format color to include #prefix
    const formattedColor = color.startsWith("#") ? color : `#${color}`;

    const updatedPixel = await prisma.$transaction(async (tx) => {
      // Lock and check it exists
      const existingPixel = await tx.$queryRaw<Array<{ x: number; y: number; color: string }>>`
        SELECT * FROM "Pixel" 
        WHERE x = ${x} AND y = ${y} 
        FOR UPDATE
      `;

      // If pixel doesn't exist, return null to handle gracefully
      if (!existingPixel || existingPixel.length === 0) {
        return null;
      }

      // Update the pixel
      const pixel = await tx.pixel.update({
        where: {
          x_y: {
            x,
            y,
          },
        },
        data: {
          color: formattedColor,
        },
      });

      // Record the update in history
      await tx.history.create({
        data: {
          x,
          y,
          color: formattedColor,
        },
      });

      return pixel;
    });

    // Handle case where pixel doesn't exist
    if (!updatedPixel) {
      return NextResponse.json(
        { success: false, error: "Pixel does not exist at these coordinates" },
        { status: 400 }
      );
    }

    return NextResponse.json({ 
      success: true, 
      message: "Pixel updated successfully",
      data: updatedPixel
    });
  } catch (error) {
    console.error("Error processing request:", error);
    
    // If pixel doesn't exist 400
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025") {
      return NextResponse.json(
        { success: false, error: "Pixel does not exist at these coordinates" },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { success: false, error: `Failed to update pixel: ${error instanceof Error ? error.message : 'Unknown error'}` },
      { status: 500 }
    );
  }
}