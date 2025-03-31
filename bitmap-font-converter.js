const fs = require('fs');
const path = require('path');

// Function to convert base64 to binary string
function base64ToBinary(base64) {
  const buffer = Buffer.from(base64, 'base64');
  let binaryString = '';
  
  for (let i = 0; i < buffer.length; i++) {
    const byte = buffer[i];
    // Convert each byte to 8 bits binary string
    binaryString += byte.toString(2).padStart(8, '0');
  }
  
  return binaryString;
}

// Function to convert binary string to base64
function binaryToBase64(binaryString) {
  // Ensure the binary string length is a multiple of 8
  const paddedBinary = binaryString.padEnd(Math.ceil(binaryString.length / 8) * 8, '0');
  
  // Convert binary string to buffer
  const buffer = Buffer.alloc(paddedBinary.length / 8);
  
  for (let i = 0; i < paddedBinary.length; i += 8) {
    const byte = parseInt(paddedBinary.substring(i, i + 8), 2);
    buffer[i / 8] = byte;
  }
  
  return buffer.toString('base64');
}

// Function to remove the rightmost column from 8x8 bitmap
function removeRightmostColumn(binaryString) {
  // For 8x8 bitmap, we need to remove every 8th bit
  let newBinaryString = '';
  
  for (let row = 0; row < 8; row++) {
    const rowStart = row * 8;
    // Take first 7 bits of each row (skipping the 8th bit)
    newBinaryString += binaryString.substring(rowStart, rowStart + 7);
  }
  
  return newBinaryString;
}

async function main() {
  try {
    // Parse command line arguments
    const args = process.argv.slice(2);
    
    // Default options
    let inputFile = 'components/bitmap-font/bitmap-font.json';
    let outputFile = 'components/bitmap-font/bitmap-font-7x8.json';
    let replaceOriginal = false;
    
    // Parse arguments
    for (let i = 0; i < args.length; i++) {
      if (args[i] === '--input' && i + 1 < args.length) {
        inputFile = args[i + 1];
        i++;
      } else if (args[i] === '--output' && i + 1 < args.length) {
        outputFile = args[i + 1];
        i++;
      } else if (args[i] === '--replace') {
        replaceOriginal = true;
      }
    }
    
    // Resolve file paths
    const resolvedInputPath = path.resolve(inputFile);
    const resolvedOutputPath = path.resolve(outputFile);
    
    console.log(`Reading from: ${resolvedInputPath}`);
    console.log(`Writing to: ${resolvedOutputPath}`);
    
    // Read the bitmap font file
    const fontData = JSON.parse(fs.readFileSync(resolvedInputPath, 'utf8'));
    
    // Find the 8x8 font
    const font8x8Index = fontData.fonts.findIndex(font => font.width === 8 && font.height === 8);
    
    if (font8x8Index === -1) {
      console.error('No 8x8 font found in the file.');
      return;
    }
    
    const font8x8 = fontData.fonts[font8x8Index];
    
    // Create a new font with 7x8 dimensions (changing the width to 7)
    const font7x8 = {
      width: 7,
      height: 8,
      characters: []
    };
    
    // Process each character
    font8x8.characters.forEach(char => {
      // Convert base64 to binary
      const binaryData = base64ToBinary(char.data);
      
      // Remove rightmost column
      const modifiedBinary = removeRightmostColumn(binaryData);
      
      // Convert back to base64
      const newBase64Data = binaryToBase64(modifiedBinary);
      
      // Add to new font
      font7x8.characters.push({
        charCode: char.charCode,
        char: char.char,
        data: newBase64Data
      });
    });
    
    // Create the output data based on the replace option
    let outputData;
    
    if (replaceOriginal) {
      // Replace the 8x8 font with the 7x8 font
      const newFonts = [...fontData.fonts];
      newFonts[font8x8Index] = font7x8;
      
      outputData = {
        ...fontData,
        fonts: newFonts
      };
      
      console.log('Replaced 8x8 font with 7x8 font');
    } else {
      // Add the 7x8 font as a new font
      outputData = {
        ...fontData,
        fonts: [...fontData.fonts, font7x8]
      };
      
      console.log('Added 7x8 font as a new font');
    }
    
    // Write to the output file
    fs.writeFileSync(resolvedOutputPath, JSON.stringify(outputData, null, 2));
    
    console.log(`Successfully processed font data and saved to ${resolvedOutputPath}`);
    
    // Print usage information
    if (replaceOriginal) {
      console.log('\nThe 8x8 font has been replaced with a 7x8 font that has the rightmost column removed.');
    } else {
      console.log('\nA new 7x8 font has been added to the file with the rightmost column removed from the 8x8 font.');
    }
    
  } catch (error) {
    console.error('Error processing font data:', error);
  }
}

// Print help information if requested
if (process.argv.includes('--help') || process.argv.includes('-h')) {
  console.log(`
Bitmap Font Converter - Convert 8x8 bitmaps to 7x8 by removing the rightmost column

Usage:
  node bitmap-font-converter.js [options]

Options:
  --input <file>    Input JSON file (default: components/bitmap-font/bitmap-font.json)
  --output <file>   Output JSON file (default: components/bitmap-font/bitmap-font-7x8.json)
  --replace         Replace the original 8x8 font with the 7x8 font (default: false)
  --help, -h        Show this help message
  
Examples:
  # Add a new 7x8 font to the output file
  node bitmap-font-converter.js
  
  # Replace the 8x8 font with a 7x8 font
  node bitmap-font-converter.js --replace
  
  # Specify custom input and output files
  node bitmap-font-converter.js --input ./my-font.json --output ./modified-font.json
  `);
} else {
  main();
} 