"use client"

import bitmapFontFile from "@/components/bitmap-font/bitmap-font.json"
import { useRef, useState, useEffect, useCallback, forwardRef, ReactNode, memo, useMemo, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import AddGridSize from "./add-grid-size"
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual'
import BitmapFontEditor from "../bitmap-font-editor"
import { base64ToBinary, binaryToBase64 } from "../bitmap-font-utils"
import { Download, Info } from "lucide-react"
import { Input } from "@/components/ui/input"
import { 
    Tooltip,
    TooltipContent,
    TooltipProvider,
    TooltipTrigger
} from "@/components/ui/tooltip"
import { Slider } from "@/components/ui/slider"

const bitmapFont = bitmapFontFile.fonts;

export interface BitmapFontCharacter {
    charCode: number;
    char: string;
    data: string;
}

export interface BitmapFont {
    width: number;
    height: number;
    characters: BitmapFontCharacter[];
}

// Basic ASCII (32-126)
export const basicAsciiSet = Array.from({ length: 95 }, (_, i) => ({
    charCode: i + 32,
}))

// Latin-1 Supplement (128-255)
export const latin1Set = Array.from({ length: 128 }, (_, i) => ({
    charCode: i + 128,
}))

// Greek and Coptic (880-1023)
export const greekSet = Array.from({ length: 144 }, (_, i) => ({
    charCode: i + 880,
}))

// Cyrillic (1024-1279)
export const cyrillicSet = Array.from({ length: 256 }, (_, i) => ({
    charCode: i + 1024,
}))

// Symbols and Pictographs (8592-8703)
export const symbolsSet = Array.from({ length: 112 }, (_, i) => ({
    charCode: i + 8592,
}))

// generate all char codes in Basic ASCII, Latin-1, Greek, Cyrillic, Symbols
const charCodesGroups = [
    { name: "Basic ASCII", charCodes: basicAsciiSet },
    { name: "Latin-1 Supplement", charCodes: latin1Set },
    { name: "Greek and Coptic", charCodes: greekSet },
    { name: "Cyrillic", charCodes: cyrillicSet },
    { name: "Symbols and Pictographs", charCodes: symbolsSet },
]


// Constants for grid layout
const ITEM_WIDTH = 40;
const ITEM_HEIGHT = 60;

// Create a flat array of all characters
const allCharacters = charCodesGroups.flatMap(group => group.charCodes);

interface Character {
    charCode: number;
}

const CharacterItem = memo(({ 
    charCode, 
    onCharacterClick, 
    BinaryToSvgWrapper, 
    selectedSize,
    isSelected 
}: { 
    charCode: number; 
    onCharacterClick: (e: React.MouseEvent<HTMLDivElement>) => void; 
    BinaryToSvgWrapper: React.ComponentType<{ size: string; charCode: number }>;
    selectedSize: string;
    isSelected: boolean;
}) => {
    return (
        <div
            className={cn(
                "flex flex-col items-center justify-between border p-1 hover:bg-gray-100 dark:hover:bg-gray-800 cursor-pointer",
                isSelected && "bg-blue-100 dark:bg-blue-900 border-blue-500"
            )}
            style={{
                width: `${ITEM_WIDTH}px`,
                height: `${ITEM_HEIGHT}px`,
                padding: '4px',
            }}
            onClick={onCharacterClick}
            data-char-code={charCode}
        >
            <span className="text-sm mb-1 font-mono">{String.fromCharCode(charCode)}</span>
            <div className="flex-1 flex items-center justify-center">
                <BinaryToSvgWrapper size={selectedSize} charCode={charCode} />
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.charCode === nextProps.charCode && 
           prevProps.selectedSize === nextProps.selectedSize &&
           prevProps.isSelected === nextProps.isSelected;
});

const CharacterGrid = memo(({ 
    selectedSize, 
    onCharacterSelect,
    BinaryToSvgWrapper,
    selectedCharacter 
}: {
    selectedSize: string;
    onCharacterSelect: (charCode: string) => void;
    BinaryToSvgWrapper: React.ComponentType<{ size: string; charCode: number }>;
    selectedCharacter: string;
}) => {
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const updateItemsPerRow = () => {
            if (!containerRef.current) return;
            const containerWidth = containerRef.current.offsetWidth;
        };

        updateItemsPerRow();
        window.addEventListener('resize', updateItemsPerRow);
        return () => window.removeEventListener('resize', updateItemsPerRow);
    }, []);

    // Scroll to selected character when it changes
    useEffect(() => {
        if (!containerRef.current || !selectedCharacter) return;

        const selectedElement = containerRef.current.querySelector(`[data-char-code="${selectedCharacter}"]`);
        if (selectedElement) {
            selectedElement.scrollIntoView({
                behavior: 'smooth',
                block: 'nearest'
            });
        }
    }, [selectedCharacter]);

    const handleCharacterClick = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
        const charCode = e.currentTarget.dataset.charCode;
        if (!charCode) return;
        onCharacterSelect(charCode);
    }, [onCharacterSelect]);

    return (
        <div 
            ref={containerRef}
            className="w-full overflow-auto border border-gray-200 dark:border-gray-700 rounded-md p-2 h-[32vh]" 
        >
            <div className="flex flex-wrap gap-1 p-1">
                {allCharacters.map((char: Character) => (
                    <CharacterItem
                        key={char.charCode}
                        charCode={char.charCode}
                        onCharacterClick={handleCharacterClick}
                        BinaryToSvgWrapper={BinaryToSvgWrapper}
                        selectedSize={selectedSize}
                        isSelected={char.charCode.toString() === selectedCharacter}
                    />
                ))}
            </div>
        </div>
    );
});

// Preview sentence component memoized to avoid unnecessary re-renders - stateless version
const SentencePreview = memo(({ 
    fontData, 
    selectedSize, 
    selectedCharacter,
    sentence = "Hello World! The quick brown fox jumps over the lazy dog.",
    scale = 1,
    gap = 1,
    fontVersion
}: { 
    fontData: Map<string, Map<number, string>>; 
    selectedSize: string;
    selectedCharacter: string;
    sentence?: string;
    scale?: number;
    gap?: number;
    fontVersion: number;
}) => {
    const [width, height] = selectedSize.split('x').map(Number);
    const charMap = fontData.get(selectedSize);
    const selectedCharCode = parseInt(selectedCharacter);
    const uniqueChars = new Set(Array.from(sentence)).size;
    
    // Count how many characters have bitmap data defined
    const definedChars = useMemo(() => {
        if (!charMap) return 0;
        return Array.from(sentence)
            .filter(char => char !== ' ' && charMap.has(char.charCodeAt(0)))
            .length;
    }, [sentence, charMap]);

    // Calculate SVG dimensions
    const svgData = useMemo(() => {
        const charWidth = width * scale;
        const charHeight = height * scale;
        const spaceWidth = width * scale * 0.5; // Space width is half a character
        const gapWidth = gap;
        
        // Calculate total width by summing all character widths + gaps
        let totalWidth = 0;
        let paths: { path: string; x: number; charCode: number }[] = [];
        
        // Process each character
        Array.from(sentence).forEach((char) => {
            const charCode = char.charCodeAt(0);
            
            // Handle spaces
            if (char === ' ') {
                totalWidth += spaceWidth;
                return;
            }
            
            const binaryString = charMap?.get(charCode);
            if (!binaryString) {
                // If no data, just add the width
                totalWidth += charWidth;
                return;
            }
            
            // Generate path for this character
            const binaryArray = binaryString.padEnd(width * height, '0').slice(0, width * height);
            const pathData = Array.from({ length: width * height }).map((_, i) => {
                if (i >= binaryArray.length) return '';
                const isBlack = binaryArray[i] === '1';
                if (!isBlack) return '';
                const x = i % width;
                const y = Math.floor(i / width);
                return `M ${x} ${y} h 1 v 1 h -1 z`;
            }).join(' ');
            
            // Add path with position
            paths.push({
                path: pathData,
                x: totalWidth,
                charCode
            });
            
            // Increase total width
            totalWidth += charWidth;
            totalWidth += gapWidth; // Add gap after each character
        });
        
        return {
            width: totalWidth,
            height: charHeight,
            paths,
            charWidth,
            charHeight
        };
    }, [sentence, charMap, width, height, scale, gap, fontVersion]);

    return (
        <div className="w-full border border-gray-200 dark:border-gray-700 p-3 rounded-md">
            <div className="flex justify-between items-center mb-2">
                <h3 className="text-sm font-medium">Preview</h3>
                <TooltipProvider>
                    <Tooltip>
                        <TooltipTrigger asChild>
                            <button className="inline-flex items-center text-gray-500 hover:text-gray-700 dark:hover:text-gray-300">
                                <Info className="w-4 h-4" />
                            </button>
                        </TooltipTrigger>
                        <TooltipContent>
                            <p>Characters with defined bitmap data: {definedChars} / {sentence.length - sentence.split(' ').length + 1}</p>
                            <p>Preview of how the bitmap font renders text</p>
                        </TooltipContent>
                    </Tooltip>
                </TooltipProvider>
            </div>
            <div className="overflow-x-auto pb-2 border-b border-gray-100 dark:border-gray-800">
                <svg 
                    width={svgData.width} 
                    height={svgData.height} 
                    viewBox={`0 0 ${svgData.width} ${svgData.height}`} 
                    className="dark:invert"
                >
                    {svgData.paths.map((item, index) => (
                        <g key={index} transform={`translate(${item.x}, 0) scale(${scale})`}>
                            <path d={item.path} fill="black" />
                        </g>
                    ))}
                </svg>
            </div>
            <div className="flex justify-between items-center mt-2">
                <div className="text-xs text-gray-500">Font size: {selectedSize}</div>
                <div className="text-xs text-gray-500">{sentence.length} characters ({uniqueChars} unique)</div>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    // Custom comparison to avoid unnecessary re-renders
    // Only re-render if these specific props change
    // For fontData, we rely on fontVersion to detect changes since fontData is a ref
    return prevProps.selectedSize === nextProps.selectedSize && 
           prevProps.sentence === nextProps.sentence && 
           prevProps.selectedCharacter === nextProps.selectedCharacter &&
           prevProps.scale === nextProps.scale &&
           prevProps.gap === nextProps.gap &&
           prevProps.fontVersion === nextProps.fontVersion;
});

// Scale and gap controls for sentence preview
const PreviewControls = memo(({ 
    scale, 
    gap, 
    onScaleChange, 
    onGapChange 
}: { 
    scale: number;
    gap: number;
    onScaleChange: (newScale: number) => void;
    onGapChange: (newGap: number) => void;
}) => {
    const handleScaleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onScaleChange(parseFloat(e.target.value));
    };
    
    const handleGapChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onGapChange(parseFloat(e.target.value));
    };
    
    return (
        <div className="flex gap-4 items-center justify-end mb-2 text-sm">
            <div className="flex items-center gap-2">
                <label htmlFor="preview-scale" className="text-xs whitespace-nowrap">Scale:</label>
                <input
                    id="preview-scale"
                    type="range"
                    min="1"
                    max="3"
                    step="0.25"
                    value={scale}
                    onChange={handleScaleChange}
                    className="w-24"
                />
                <span className="text-xs">{scale.toFixed(2)}x</span>
            </div>
            <div className="flex items-center gap-2">
                <label htmlFor="preview-gap" className="text-xs whitespace-nowrap">Gap:</label>
                <input
                    id="preview-gap"
                    type="range"
                    min="0"
                    max="5"
                    step="1"
                    value={gap}
                    onChange={handleGapChange}
                    className="w-24"
                />
                <span className="text-xs">{gap}px</span>
            </div>
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.scale === nextProps.scale && prevProps.gap === nextProps.gap;
});

const SentenceInput = memo(({ 
    sentence, 
    onSentenceChange 
}: { 
    sentence: string, 
    onSentenceChange: (newSentence: string) => void 
}) => {
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        onSentenceChange(e.target.value);
    };
    
    return (
        <div className="w-full">
            <Input
                type="text"
                value={sentence}
                onChange={handleChange}
                placeholder="Type a custom preview sentence..."
                className="w-full"
                aria-label="Preview sentence"
            />
        </div>
    );
}, (prevProps, nextProps) => {
    return prevProps.sentence === nextProps.sentence;
});

export default function BitmapFontDesignerClient() {
    // Create a map of size -> charCode -> binary data for fast access
    const fontData = useRef(new Map(bitmapFont.map(font => {
        const size = `${font.width}x${font.height}`;
        const charMap = new Map<number, string>();
        font.characters.forEach(char => {
            // Convert base64 to binary string (1s and 0s) for storage
            charMap.set(char.charCode, base64ToBinary(char.data));
        });
        return [size, charMap];
    })));

    const [gridSizes, setGridSizes] = useState(bitmapFont.map(font => `${font.width}x${font.height}`));
    const [selectedSize, setSelectedSize] = useState<string>("8x8");
    const [selectedCharacter, setSelectedCharacter] = useState<string>(`65`);
    const [fontVersion, setFontVersion] = useState(0);
    const [previewVersion, setPreviewVersion] = useState(0);
    const [previewSentence, setPreviewSentence] = useState("Hello World! The quick brown fox jumps over the lazy dog.");
    const [previewScale, setPreviewScale] = useState(2);
    const [previewGap, setPreviewGap] = useState(0);
    
    function binaryToSvg({charCode, size}: {charCode: number, size: string}): React.ReactNode {
        const charMap = fontData.current.get(size);
        const binaryString = charMap?.get(charCode);
        if (!binaryString) return <div className="size-5 border border-gray-200 dark:border-gray-600 border-dashed flex items-center justify-center">{String.fromCharCode(charCode)}</div>

        try {
            const [width, height] = size.split('x').map(Number);
            // Use binary string directly, ensure it's the right length
            const binaryArray = binaryString.padEnd(width * height, '0').slice(0, width * height);

            // Create a single path element instead of multiple rects
            const pathData = Array.from({ length: width * height }).map((_, i) => {
                if (i >= binaryArray.length) return '';
                const isBlack = binaryArray[i] === '1';
                if (!isBlack) return '';
                const x = i % width;
                const y = Math.floor(i / width);
                return `M ${x} ${y} h 1 v 1 h -1 z`;
            }).join(' ');

            return (
                <div className="size-5 dark:invert border-[0.5px] border-gray-200 dark:border-gray-600 flex items-center justify-center overflow-hidden">
                    <svg className="w-full h-full" width={width} height={height} viewBox={`0 0 ${width} ${height}`}>
                        <path d={pathData} fill="black" />
                    </svg>
                </div>
            )
        } catch (error) {
            console.error("Error processing binary:", error)
            return <div className="size-5 border border-gray-200 dark:border-gray-600 border-dashed flex items-center justify-center text-xs">?</div>
        }
    }

    const MemoizedBinaryToSvg = memo(binaryToSvg, (prevProps, nextProps) => {
        return prevProps.charCode === nextProps.charCode && 
               prevProps.size === nextProps.size;
    });

    // Memoize the current character's data
    const currentCharacterData = useMemo(() => {
        const charMap = fontData.current.get(selectedSize);
        if (!charMap) return null;

        const charCode = parseInt(selectedCharacter);
        const binaryString = charMap.get(charCode);
        if (!binaryString) return null;

        const [width, height] = selectedSize.split('x').map(Number);
        
        return {
            binaryData: binaryString.padEnd(width * height, '0').slice(0, width * height),
            width,
            height
        };
    }, [selectedSize, selectedCharacter]);

    const handleDataChange = useCallback((newData: string) => {
        const charMap = fontData.current.get(selectedSize);
        if (!charMap) return;

        const charCode = parseInt(selectedCharacter);
        // Store binary string directly
        charMap.set(charCode, newData);
        
        // Don't create a new Map as it's expensive
        // Instead just update the version to trigger re-renders
        setPreviewVersion(v => v + 1);
    }, [selectedSize, selectedCharacter]);

    const handleSizeChange = useCallback((e: React.MouseEvent<HTMLButtonElement>) => {
        const size = e.currentTarget.dataset.size;
        if (!size) return;
        setSelectedSize(size);
    }, []);

    const handleCharacterSelect = useCallback((charCode: string) => {
        setSelectedCharacter(charCode);
    }, []);

    const handlePreviewSentenceChange = useCallback((newSentence: string) => {
        setPreviewSentence(newSentence);
    }, []);

    const handlePreviewScaleChange = useCallback((newScale: number) => {
        setPreviewScale(newScale);
    }, []);
    
    const handlePreviewGapChange = useCallback((newGap: number) => {
        setPreviewGap(newGap);
    }, []);

    // Memoize the BinaryToSvgWrapper component
    const BinaryToSvgWrapper = useMemo(() => 
        memo(({ size, charCode }: { size: string, charCode: number }) => {
            // Force refresh on previewVersion change
            return <MemoizedBinaryToSvg key={`${size}-${charCode}-${previewVersion}`} charCode={charCode} size={size} />;
        }, (prevProps, nextProps) => {
            return prevProps.size === nextProps.size && 
                   prevProps.charCode === nextProps.charCode;
        }),
        [previewVersion]
    );

    // Function to save the font data to JSON
    const saveFontData = useCallback(() => {
        // Convert the internal binary string representation back to base64 for storage
        const fontDataToSave = Array.from(fontData.current.entries()).map(([size, charMap]) => {
            const [width, height] = size.split('x').map(Number);
            
            return {
                width,
                height,
                characters: Array.from(charMap.entries())
                    .filter(([_, binaryString]) => binaryString.includes('1')) // Only include non-empty characters
                    .map(([charCode, binaryString]) => ({
                        charCode,
                        char: String.fromCharCode(charCode),
                        // Convert binary string to base64 for storage
                        data: binaryToBase64(binaryString)
                    }))
            };
        });

        // Add metadata to the exported font
        const exportData = {
            metadata: {
                name: "Bitmap Font",
                creator: "Bitmap Font Designer",
                createdAt: new Date().toISOString(),
                version: "1.0",
                description: "Custom bitmap font created with Bitmap Font Designer"
            },
            fonts: fontDataToSave
        };

        // Create a JSON string with the font data
        const jsonData = JSON.stringify(exportData, null, 2);
        
        // Create a meaningful filename with date
        const date = new Date();
        const dateStr = `${date.getFullYear()}-${(date.getMonth() + 1).toString().padStart(2, '0')}-${date.getDate().toString().padStart(2, '0')}`;
        const timeStr = `${date.getHours().toString().padStart(2, '0')}${date.getMinutes().toString().padStart(2, '0')}`;
        const filename = `bitmap-font-${dateStr}-${timeStr}.json`;
        
        // Create a download link for the data
        const blob = new Blob([jsonData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = filename;
        document.body.appendChild(a);
        a.click();
        
        // Clean up
        setTimeout(() => {
            document.body.removeChild(a);
            URL.revokeObjectURL(url);
        }, 0);
    }, []);

    // Add effect to update view when selected character changes
    useEffect(() => {
        // Force an update to preview version when selected character changes
        setPreviewVersion(v => v + 1);
    }, [selectedCharacter, selectedSize]);

    return (
        <div className="w-full flex flex-col gap-4">
            <div className="flex flex-wrap gap-2 mb-4 justify-between">
                <div className="flex flex-wrap gap-2">
                    {gridSizes.map((size) => (
                        <Button 
                            key={size} 
                            className={cn(selectedSize === size && "bg-blue-500 hover:bg-blue-600")} 
                            onClick={handleSizeChange} 
                            data-size={size}
                        >
                            {size}
                        </Button>
                    ))}
                    <AddGridSize setGridSize={setGridSizes} gridSizes={gridSizes} />
                </div>
                <Button onClick={saveFontData} variant="outline" size="icon" title="Save font data">
                    <Download className="w-4 h-4" />
                </Button>
            </div>

            <CharacterGrid 
                selectedSize={selectedSize}
                onCharacterSelect={handleCharacterSelect}
                BinaryToSvgWrapper={BinaryToSvgWrapper}
                selectedCharacter={selectedCharacter}
            />

            <div className="space-y-2">
                <SentenceInput 
                    sentence={previewSentence} 
                    onSentenceChange={handlePreviewSentenceChange} 
                />
                
                <PreviewControls
                    scale={previewScale}
                    gap={previewGap}
                    onScaleChange={handlePreviewScaleChange}
                    onGapChange={handlePreviewGapChange}
                />
                
                <SentencePreview 
                    fontData={fontData.current} 
                    selectedSize={selectedSize} 
                    sentence={previewSentence}
                    selectedCharacter={selectedCharacter}
                    scale={previewScale}
                    gap={previewGap}
                    fontVersion={previewVersion}
                />
            </div>

            <div className="w-full">
                <BitmapFontEditor
                    selectedSize={selectedSize}
                    selectedCharacter={selectedCharacter}
                    binaryData={currentCharacterData?.binaryData ?? (() => {
                        const [w, h] = selectedSize.split('x').map(Number);
                        return '0'.repeat(w * h);
                    })()}
                    onDataChange={handleDataChange}
                />
            </div>
        </div>
    );
}
