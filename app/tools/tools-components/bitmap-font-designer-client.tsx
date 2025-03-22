"use client"

import bitmapFont from "@/components/bitmap-font/bitmap-font.json"
import { useRef, useState, useEffect, useCallback, forwardRef, ReactNode, memo, useMemo, Fragment } from "react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import AddGridSize from "./add-grid-size"
import { useVirtualizer, VirtualItem } from '@tanstack/react-virtual'
import BitmapFontEditor from "../bitmap-font-editor"
import { base64ToBinary, binaryToBase64 } from "./bitmap-font-utils"

export interface BitmapFontCharacter {
    charCode: number;
    char: string;
    data: string;  // base64 data
}

export interface BitmapFont {
    width: number;
    height: number;
    characters: BitmapFontCharacter[];
}

// Cache for binary strings to avoid repeated conversions
const binaryCache = new Map<string, string>();

const getBinaryString = (base64: string): string => {
    if (binaryCache.has(base64)) {
        return binaryCache.get(base64)!;
    }
    const binary = base64ToBinary(base64);
    binaryCache.set(base64, binary);
    return binary;
};

export default function BitmapFontDesignerClient() {
    // Create a map of size -> charCode -> binary data for fast access
    const fontData = useRef(new Map(bitmapFont.map(font => {
        const size = `${font.width}x${font.height}`;
        const charMap = new Map<number, string>();
        font.characters.forEach(char => {
            charMap.set(char.charCode, char.data);  // char.data is base64
        });
        return [size, charMap];
    })));

    // ... other state declarations ...

    // Memoize the current character's data
    const currentCharacterData = useMemo(() => {
        const charMap = fontData.current.get(selectedSize);
        if (!charMap) return null;

        const charCode = parseInt(selectedCharacter);
        const base64 = charMap.get(charCode);
        if (!base64) return null;

        const [width, height] = selectedSize.split('x').map(Number);
        return {
            binaryData: getBinaryString(base64).slice(0, width * height),
            width,
            height
        };
    }, [selectedSize, selectedCharacter]);

    const handleDataChange = useCallback((newData: string) => {
        const charMap = fontData.current.get(selectedSize);
        if (!charMap) return;

        const charCode = parseInt(selectedCharacter);
        // Convert binary string back to base64 for storage
        const base64 = binaryToBase64(newData);
        charMap.set(charCode, base64);
    }, [selectedSize, selectedCharacter]);

    // ... rest of the component code ...
} 