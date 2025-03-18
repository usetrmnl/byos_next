import { cn } from "@/lib/utils"

interface FontSize {
  width: number
  height: number
}

interface FontCharacter {
  charCode: number
  char: string
  data: string
}

interface FontData {
  size: FontSize
  format: string
  characters: FontCharacter[]
}

interface BitmapTextProps {
  text: string
  fontData: FontData | string
  className?: string
  letterSpacing?: number
  scale?: number
  color?: string
}

// Convert Base64 to binary - server-safe implementation
function base64ToBinary(base64: string): Uint8Array {
  // Use a safe implementation that works in all environments
  if (typeof Buffer !== 'undefined') {
    // Node.js environment
    const buffer = Buffer.from(base64, 'base64');
    return new Uint8Array(buffer);
  } else {
    // Browser environment fallback
    try {
      const binaryString = globalThis.atob?.(base64) ?? '';
      const binary = new Uint8Array(binaryString.length);
      
      for (let i = 0; i < binaryString.length; i++) {
        binary[i] = binaryString.charCodeAt(i);
      }
      
      return binary;
    } catch (error: any) {
      console.error("Error in base64ToBinary:", error);
      console.error("Input base64 (first 50 chars):", base64.substring(0, 50));
      throw new Error(`Failed to convert base64 to binary: ${error.message || 'Unknown error'}`);
    }
  }
}

// Convert binary data back to grid
function binaryToGrid(binary: Uint8Array, width: number, height: number): boolean[][] {
  try {
    const bytesPerRow = Math.ceil(width / 8)
    const grid: boolean[][] = Array(height)
      .fill(0)
      .map(() => Array(width).fill(false))

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        const byteIndex = y * bytesPerRow + Math.floor(x / 8)
        const bitPosition = 7 - (x % 8) // MSB first

        if (byteIndex < binary.length) {
          grid[y][x] = ((binary[byteIndex] >> bitPosition) & 1) === 1
        }
      }
    }

    return grid;
  } catch (error: any) {
    console.error("Error in binaryToGrid:", error);
    console.error("Binary data details:", { length: binary?.length, width, height });
    throw new Error(`Failed to convert binary to grid: ${error.message || 'Unknown error'}`);
  }
}

// Process font data synchronously
function processCharacters(data: FontData): Map<number, boolean[][]> {
  try {
    if (!data) {
      throw new Error('No font data provided');
    }
    
    if (!data.size || typeof data.size.width !== 'number' || typeof data.size.height !== 'number') {
      console.error('Font data size issue:', data.size);
      throw new Error('Invalid font data: missing or invalid size property');
    }
    
    const grids = new Map<number, boolean[][]>();
    
    if (!Array.isArray(data.characters)) {
      console.error('Font data characters issue:', typeof data.characters);
      throw new Error('Invalid font data: characters must be an array');
    }
    
    console.log(`Processing ${data.characters.length} characters with format "${data.format}"`);
    
    if (data.characters.length === 0) {
      console.warn('No characters to process in font data');
      return grids;
    }
    
    data.characters.forEach((char, index) => {
      if (!char.charCode) {
        console.warn(`Character at index ${index} missing charCode`);
        return;
      }
      
      if (data.format === "base64" && char.data) {
        try {
          const binary = base64ToBinary(char.data);
          const grid = binaryToGrid(binary, data.size.width, data.size.height);
          grids.set(char.charCode, grid);
        } catch (error) {
          console.error(`Error processing character ${char.char} (code ${char.charCode}):`, error);
        }
      } else if (data.format !== "base64") {
        console.warn(`Unsupported format "${data.format}" for character ${char.char}`);
      } else if (!char.data) {
        console.warn(`Missing data for character ${char.char}`);
      }
    });
    
    console.log(`Successfully processed ${grids.size} characters`);
    return grids;
  } catch (error) {
    console.error("Error in processCharacters:", error);
    throw error;
  }
}

export function BitmapText({
  text,
  fontData,
  className,
  letterSpacing = 0,
  scale = 1,
  color = "currentColor",
}: BitmapTextProps) {
  // Parse string font data if necessary
  let parsedFont: FontData;
  try {
    parsedFont = typeof fontData === "string" 
      ? JSON.parse(fontData) 
      : fontData;
      
    if (!parsedFont) {
      console.error("Font data is null or undefined");
      return <span className={className}>No font data provided</span>;
    }
  } catch (error) {
    console.error("Error parsing font data:", error);
    return <span className={className}>Invalid font data</span>;
  }
  
  // Process font data synchronously
  let charGrids: Map<number, boolean[][]>;
  try {
    charGrids = processCharacters(parsedFont);
  } catch (error) {
    console.error("Error processing font characters:", error);
    return <span className={className}>{String(error) || "Error processing font"}</span>;
  }
  
  if (!charGrids || charGrids.size === 0) {
    console.error("No characters were successfully processed from font data");
    return <span className={className}>No font data available</span>
  }

  const { width, height } = parsedFont.size
  const scaledWidth = width * scale
  const scaledHeight = height * scale

  // Calculate total width for the SVG
  const totalWidth =
    text.split("").reduce((acc, char) => {
      const charCode = char.charCodeAt(0)
      return acc + (charGrids.has(charCode) ? scaledWidth : 0) + letterSpacing
    }, 0) - letterSpacing // Remove trailing space

  if (totalWidth <= 0 || scaledHeight <= 0) {
    return <span className={className}>Invalid dimensions</span>;
  }

  return (
    <svg
      width={totalWidth}
      height={scaledHeight}
      viewBox={`0 0 ${totalWidth} ${scaledHeight}`}
      className={cn("inline-block align-middle", className)}
      style={{
        imageRendering: "pixelated",
        shapeRendering: "crispEdges",
      }}
    >
      {text.split("").map((char, index) => {
        const charCode = char.charCodeAt(0)
        const grid = charGrids.get(charCode)

        if (!grid) {
          // Skip characters not in the font
          return null
        }

        // Calculate x position based on previous characters
        const xPosition = text
          .slice(0, index)
          .split("")
          .reduce((acc, prevChar) => {
            const prevCharCode = prevChar.charCodeAt(0)
            return acc + (charGrids.has(prevCharCode) ? scaledWidth : 0) + letterSpacing
          }, 0)

        return (
          <g key={index} transform={`translate(${xPosition}, 0)`}>
            {grid.map((row, y) =>
              row.map(
                (cell, x) =>
                  cell && (
                    <rect
                      key={`${index}-${y}-${x}`}
                      x={x * scale}
                      y={y * scale}
                      width={scale}
                      height={scale}
                      fill={color}
                    />
                  ),
              ),
            )}
          </g>
        )
      })}
    </svg>
  )
}

export default BitmapText;