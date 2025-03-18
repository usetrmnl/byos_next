"use client"

import type * as React from "react"
import { useState, useEffect, useRef, useCallback } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"
import { ScrollArea, ScrollBar } from "@/components/ui/scroll-area"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Copy,
  ClipboardPasteIcon as Paste,
  Undo,
  Redo,
  RotateCcw,
  RotateCw,
  FlipHorizontal,
  FlipVertical,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
  ArrowLeft,
  ArrowRight,
  AlertCircle,
  Save,
  Download,
  Upload,
  Search,
  Moon,
  Sun,
} from "lucide-react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Textarea } from "@/components/ui/textarea"
import { toast } from "sonner"
import defaultFontData from "@/components/bitmap-font/bitmap-font-default.json"
import { BitmapText } from "@/components/bitmap-font/bitmap-text"

// Types
interface FontSize {
  width: number
  height: number
}

enum GridSize {
  SMALL = "SMALL",
  MEDIUM = "MEDIUM",
  TALL = "TALL",
  LARGE = "LARGE",
  SQUARE = "SQUARE"
}

const GRID_SIZES: Record<GridSize, FontSize> = {
  [GridSize.SMALL]: { width: 5, height: 7 },
  [GridSize.MEDIUM]: { width: 8, height: 8 },
  [GridSize.TALL]: { width: 8, height: 12 },
  [GridSize.LARGE]: { width: 8, height: 16 },
  [GridSize.SQUARE]: { width: 12, height: 12 }
}

const GRID_SIZE_LABELS: Record<GridSize, string> = {
  [GridSize.SMALL]: "5x7",
  [GridSize.MEDIUM]: "8x8",
  [GridSize.TALL]: "8x12",
  [GridSize.LARGE]: "8x16",
  [GridSize.SQUARE]: "12x12"
}

interface FontCharacter {
  grid: boolean[][]
  lastModified: number
}

interface FontData {
  characters: Map<number, FontCharacter>
  sizes: Map<number, FontSize[]>
  lastSync: number
}

// Character ranges
const CHARACTER_RANGES = [
  { id: "basic", name: "Basic ASCII", range: [32, 126] },
  { id: "latin1", name: "Latin-1", range: [160, 255] },
  { id: "greek", name: "Greek", range: [880, 1023] },
  { id: "cyrillic", name: "Cyrillic", range: [1024, 1119] },
  { id: "symbols", name: "Symbols", range: [8592, 8703] },
]

export default function BitmapFontEditor() {
  // Core state
  const [selectedSize, setSelectedSize] = useState<GridSize>(GridSize.MEDIUM)
  const [selectedChar, setSelectedChar] = useState<number>(65) // Default to 'A'
  const [grid, setGrid] = useState<boolean[][]>(() => {
    const defaultSize = GRID_SIZES[GridSize.MEDIUM]
    return Array(defaultSize.height).fill(0).map(() => Array(defaultSize.width).fill(false))
  })
  const [cellSize, setCellSize] = useState(32)
  const [showBaseline, setShowBaseline] = useState(true)
  const [baselinePosition, setBaselinePosition] = useState(6)
  const [showShadow, setShowShadow] = useState(false)
  const [testSentence, setTestSentence] = useState("Hello, World!")
  const [history, setHistory] = useState<boolean[][][]>([])
  const [historyIndex, setHistoryIndex] = useState(-1)
  const [clipboard, setClipboard] = useState<boolean[][] | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const [hasUnsavedChanges, setHasUnsavedChanges] = useState(false)
  const [lastSaveTime, setLastSaveTime] = useState<number>(Date.now())
  const [selectedCharSet, setSelectedCharSet] = useState<string>("basic")
  const [letterSpacing, setLetterSpacing] = useState(0)
  const [searchQuery, setSearchQuery] = useState("")
  const [importData, setImportData] = useState("")
  const [selectedRanges, setSelectedRanges] = useState<string[]>(["basic"])

  // Font data state
  const [fontData, setFontData] = useState<FontData>({
    characters: new Map(),
    sizes: new Map(),
    lastSync: 0
  })

  // Add this state to cache the font data object
  const [cachedFontData, setCachedFontData] = useState<any>(null)

  // Sync engine
  const syncEngine = useCallback(() => {
    const syncToStorage = () => {
      console.log("SYNC TO STORAGE - BYPASSED")
      return
    }

    const syncFromStorage = () => {
      console.log("SYNC FROM STORAGE - BYPASSED")
      return
    }

    return { syncToStorage, syncFromStorage }
  }, [fontData, selectedSize])

  // Auto-save timer
  useEffect(() => {
    const autoSaveInterval = setInterval(() => {
      if (hasUnsavedChanges && grid.length > 0 && !isLoading) {
        saveCurrentCharacter()
      }
    }, 5000) // Auto-save every 5 seconds

    return () => clearInterval(autoSaveInterval)
  }, [hasUnsavedChanges, grid, isLoading])

  // Load initial data
  useEffect(() => {
    const loadInitialData = async () => {
      try {
        setIsLoading(true)
        console.log("=== STARTING LOAD INITIAL DATA ===")
        
        // First, load all characters from the default font data
        const mediumData = defaultFontData.MEDIUM
        console.log("Loading MEDIUM size data:", {
          width: mediumData.width,
          height: mediumData.height,
          characterCount: mediumData.characters.length
        })

        // Import all characters from the default font data
        const defaultFontResult = importFontData(JSON.stringify({
          size: {
            width: mediumData.width,
            height: mediumData.height
          },
          format: "base64",
          characters: mediumData.characters
        }))

        if (!defaultFontResult.success) {
          console.error("Failed to load default font data:", defaultFontResult.message)
          return
        }

        console.log("Successfully imported default font data:", {
          count: defaultFontResult.count
        })

        // Then load any user-defined data from localStorage
        console.log("Loading data from localStorage...")
        const { syncFromStorage } = syncEngine()
        syncFromStorage()

        // Get all font data for the current size
        const mergedData = getAllFontData(GRID_SIZES[selectedSize])
        
        // Update the font data state
        setFontData(mergedData)

        // Create the font data object for rendering
        const fontDataObj = {
          size: GRID_SIZES[selectedSize],
          format: "base64",
          characters: Array.from(mergedData.characters.entries()).map(([code, char]) => ({
            charCode: code,
            char: String.fromCharCode(code),
            data: binaryToBase64(gridToBinary(char.grid))
          }))
        }

        // Cache the font data object
        setCachedFontData(fontDataObj)

        console.log("Final font data state:", {
          characterCount: mergedData.characters.size,
          hasCharA: mergedData.characters.has(65),
          charASizes: mergedData.sizes.get(65),
          cachedFontData: {
            size: fontDataObj.size,
            format: fontDataObj.format,
            characterCount: fontDataObj.characters.length
          }
        })

        // Initialize the font keys map
        updateFontKeysMap()

        setIsLoading(false)
        toast.success("Font data loaded successfully")
      } catch (error) {
        console.error("Error loading initial data:", error)
        setIsLoading(false)
        toast.error("Failed to load font data")
      }
    }

    loadInitialData()
  }, [])

  // Auto-save changes
  useEffect(() => {
    if (hasUnsavedChanges) {
      const { syncToStorage } = syncEngine()
      syncToStorage()
    }
  }, [hasUnsavedChanges])

  // Handle character selection
  const handleCharSelect = useCallback((charCode: number) => {
    if (charCode === selectedChar) return

    // Save current character if there are changes
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    // Get character data
    const charData = fontData.characters.get(charCode)
    if (charData) {
      setGrid(charData.grid)
      setHistory([charData.grid])
      setHistoryIndex(0)
    } else {
      // Create empty grid for undefined character
      const newGrid = Array(GRID_SIZES[selectedSize].height)
        .fill(0)
        .map(() => Array(GRID_SIZES[selectedSize].width).fill(false))
      setGrid(newGrid)
      setHistory([newGrid])
      setHistoryIndex(0)
    }

    setSelectedChar(charCode)
  }, [selectedChar, grid, hasUnsavedChanges, fontData, selectedSize])

  // Save current character
  const saveCurrentCharacter = useCallback(() => {
    if (!grid || grid.length === 0) return

    const size = GRID_SIZES[selectedSize]
    const storageKey = `bitmap-font-${size.width}x${size.height}-${selectedChar}`
    
    try {
      // Save to localStorage
      localStorage.setItem(storageKey, JSON.stringify({
        grid,
        lastModified: Date.now()
      }))

      // Update in-memory store
      setFontData(prev => {
        const newCharacters = new Map(prev.characters)
        newCharacters.set(selectedChar, {
          grid,
          lastModified: Date.now()
        })

        // Update sizes map
        const newSizes = new Map(prev.sizes)
        if (!newSizes.has(selectedChar)) {
          newSizes.set(selectedChar, [])
        }
        const sizes = newSizes.get(selectedChar)!
        if (!sizes.some(s => s.width === size.width && s.height === size.height)) {
          sizes.push(size)
        }

        return {
          ...prev,
          characters: newCharacters,
          sizes: newSizes,
          lastSync: Date.now()
        }
      })

      setHasUnsavedChanges(false)
      setLastSaveTime(Date.now())
      toast.success('Character saved')
    } catch (error) {
      console.error('Error saving character:', error)
      toast.error('Failed to save character')
    }
  }, [selectedChar, selectedSize, grid, hasUnsavedChanges, fontData])

  // Grid to binary conversion
  const gridToBinary = (grid: boolean[][]): Uint8Array => {
    if (!grid.length) return new Uint8Array(0)

    const height = grid.length
    const width = grid[0].length

    // Calculate how many bytes we need
    const bytesPerRow = Math.ceil(width / 8)
    const totalBytes = bytesPerRow * height

    const binary = new Uint8Array(totalBytes)

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x]) {
          const byteIndex = y * bytesPerRow + Math.floor(x / 8)
          const bitPosition = 7 - (x % 8) // MSB first
          binary[byteIndex] |= 1 << bitPosition
        }
      }
    }

    return binary
  }

  // Convert binary to base64
  const binaryToBase64 = (binary: Uint8Array): string => {
    // Convert to string of bytes
    let binaryString = ""
    for (let i = 0; i < binary.length; i++) {
      binaryString += String.fromCharCode(binary[i])
    }
    
    // Use btoa to convert to base64
    return btoa(binaryString)
  }

  // Convert Base64 to binary
  const base64ToBinary = (base64: string): Uint8Array => {
    try {
      const binaryString = atob(base64)
      const binary = new Uint8Array(binaryString.length)
      for (let i = 0; i < binaryString.length; i++) {
        binary[i] = binaryString.charCodeAt(i)
      }
      return binary
    } catch (error) {
      console.error("Error converting base64 to binary:", error)
      throw error
    }
  }

  // Binary to grid conversion
  const binaryToGrid = (binary: Uint8Array, width: number, height: number): boolean[][] => {
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
      return grid
    } catch (error) {
      console.error("Error converting binary to grid:", error)
      throw error
    }
  }

  // Modify createFontDataObject to be more efficient
  const createFontDataObject = useCallback(() => {
    // If we already have a cached version, use it
    if (cachedFontData) {
      return cachedFontData
    }

    const currentSize = GRID_SIZES[selectedSize]
    const fontDataObj = {
      size: currentSize,
      format: "base64",  // Changed to 'base64' from 'grid'
      characters: Array.from(fontData.characters.entries()).map(([code, char]) => ({
        charCode: code,
        char: String.fromCharCode(code),
        data: binaryToBase64(gridToBinary(char.grid))  // Convert grid to base64
      }))
    }

    console.log("Creating font data object:", {
      size: fontDataObj.size,
      format: fontDataObj.format,
      characterCount: fontDataObj.characters.length,
      sample: fontDataObj.characters.length > 0 ? 
        { charCode: fontDataObj.characters[0].charCode, data: fontDataObj.characters[0].data.substring(0, 20) + "..." } : null
    })

    // Cache the result
    setCachedFontData(fontDataObj)
    return fontDataObj
  }, [fontData, selectedSize, cachedFontData])

  // Add effect to clear cache when font data changes
  useEffect(() => {
    setCachedFontData(null)
  }, [fontData, selectedSize])

  // Get characters to display
  const getDisplayCharacters = useCallback((): number[] => {
    if (selectedCharSet === "defined") {
      return Array.from(fontData.characters.keys())
    }

    const range = CHARACTER_RANGES.find((r) => r.id === selectedCharSet)
    if (range) {
      return Array.from({ length: range.range[1] - range.range[0] + 1 }, (_, i) => i + range.range[0])
    }

    return Array.from({ length: 95 }, (_, i) => i + 32)
  }, [selectedCharSet, fontData])

  // Refs for scrolling and UI
  const gridRef = useRef<HTMLDivElement>(null)
  const charSetScrollRef = useRef<HTMLDivElement>(null)
  const charScrollRef = useRef<HTMLDivElement>(null)
  const charSelectorRef = useRef<HTMLDivElement>(null)

  // Update fontKeysMap when needed
  const updateFontKeysMap = () => {
    try {
      const keysMap = new Map<number, FontSize[]>()
      const keys = Object.keys(localStorage)
      
      for (const key of keys) {
        if (key.startsWith("bitmap-font-")) {
          const charCodeMatch = key.match(/bitmap-font-(\d+)x(\d+)-(\d+)$/)
          if (charCodeMatch) {
            const width = Number.parseInt(charCodeMatch[1], 10)
            const height = Number.parseInt(charCodeMatch[2], 10)
            const charCode = Number.parseInt(charCodeMatch[3], 10)
            
            if (!keysMap.has(charCode)) {
              keysMap.set(charCode, [])
            }
            
            const sizes = keysMap.get(charCode)!
            if (!sizes.some(size => size.width === width && size.height === height)) {
              sizes.push({ width, height })
            }
          }
        }
      }
      
      setFontData(prev => ({ ...prev, sizes: keysMap }))
    } catch (error) {
      console.error("Error updating font keys map:", error)
    }
  }

  // Save user preferences when they change
  useEffect(() => {
    saveUserPreferences("selectedSize", selectedSize)
    saveUserPreferences("showBaseline", showBaseline)
    saveUserPreferences("baselinePosition", baselinePosition)
    saveUserPreferences("showShadow", showShadow)
    saveUserPreferences("testSentence", testSentence)
    saveUserPreferences("letterSpacing", letterSpacing)
    saveUserPreferences("selectedRanges", selectedRanges)
  }, [selectedSize, showBaseline, baselinePosition, showShadow, testSentence, letterSpacing, selectedRanges])

  // Determine which character set the current character belongs to
  useEffect(() => {
    for (const range of CHARACTER_RANGES) {
      if (selectedChar >= range.range[0] && selectedChar <= range.range[1]) {
        setSelectedCharSet(range.id)
        break
      }
    }

    // If it's a defined character but not in any range, select "defined"
    if (
      Array.from(fontData.characters.keys()).includes(selectedChar) &&
      !CHARACTER_RANGES.some((range) => selectedChar >= range.range[0] && selectedChar <= range.range[1])
    ) {
      setSelectedCharSet("defined")
    }
  }, [selectedChar, fontData])

  // Scroll to selected character set
  useEffect(() => {
    if (charSetScrollRef.current) {
      const selectedElement = charSetScrollRef.current.querySelector(`[data-set-id="${selectedCharSet}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }
  }, [selectedCharSet])

  // Scroll to selected character
  useEffect(() => {
    if (charScrollRef.current) {
      const selectedElement = charScrollRef.current.querySelector(`[data-char-code="${selectedChar}"]`)
      if (selectedElement) {
        selectedElement.scrollIntoView({ behavior: "smooth", block: "nearest", inline: "center" })
      }
    }
  }, [selectedChar])

  // Initialize or load character grid when selected character changes
  useEffect(() => {
    setIsLoading(true)

    // Save current character data before switching if there are unsaved changes
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    // Get character data from in-memory store
    const charGrid = fontData.characters.get(selectedChar)

    if (charGrid) {
      // Use the in-memory data
      setGrid(charGrid.grid)
      // Initialize history with the loaded grid
      setHistory([charGrid.grid])
      setHistoryIndex(0)
    } else {
      // Check if character exists in other sizes and convert
      const sizes = fontData.sizes.get(selectedChar) || []
      if (sizes.length > 0) {
        // Find a size to convert from (prefer similar sizes)
        const sourceSize = sizes[0]
        const convertedGrid = convertCharacterToNewSize(selectedChar, sourceSize, GRID_SIZES[selectedSize])

        if (convertedGrid) {
          setGrid(convertedGrid)
          setHistory([convertedGrid])
          setHistoryIndex(0)

          // Add to in-memory store
          setFontData(prev => {
            const newCharacters = new Map(prev.characters)
            newCharacters.set(selectedChar, {
              grid: convertedGrid,
              lastModified: Date.now()
            })
            return {
              ...prev,
              characters: newCharacters
            }
          })

          // Also save to localStorage immediately
          const storageKey = `bitmap-font-${GRID_SIZES[selectedSize].width}x${GRID_SIZES[selectedSize].height}-${selectedChar}`
          localStorage.setItem(storageKey, JSON.stringify({
            grid: convertedGrid,
            lastModified: Date.now()
          }))

          toast.info(`Converted from ${sourceSize.width}x${sourceSize.height} grid`)
          setIsLoading(false)
          return
        }
      }

      // If no conversion possible, create empty grid
      const newGrid = Array(GRID_SIZES[selectedSize].height)
        .fill(0)
        .map(() => Array(GRID_SIZES[selectedSize].width).fill(false))
      setGrid(newGrid)
      // Initialize history with the empty grid
      setHistory([newGrid])
      setHistoryIndex(0)
    }

    setHasUnsavedChanges(false)
    setIsLoading(false)
  }, [selectedChar, selectedSize])

  // Add this effect to handle size changes properly
  useEffect(() => {
    // When size changes, save the current character first
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    // Then reload all data for the new size
    const loadAllData = async () => {
      setIsLoading(true)

      // Load all character data from localStorage for the new size
      const data = getAllFontData(GRID_SIZES[selectedSize])
      setFontData(data)

      // Create the font data object for rendering with proper format
      const fontDataObj = {
        size: GRID_SIZES[selectedSize],
        format: "base64",
        characters: Array.from(data.characters.entries()).map(([code, char]) => ({
          charCode: code,
          char: String.fromCharCode(code),
          data: binaryToBase64(gridToBinary(char.grid))
        }))
      }

      // Cache the font data object
      setCachedFontData(fontDataObj)

      console.log("Size changed - new font data:", {
        size: selectedSize,
        characterCount: data.characters.size,
        cachedDataFormat: fontDataObj.format,
        cachedCharacterCount: fontDataObj.characters.length
      })

      // Update the font keys map
      updateFontKeysMap()

      setIsLoading(false)
    }

    loadAllData()
  }, [selectedSize])

  // Auto-save to localStorage when component unmounts
  useEffect(() => {
    return () => {
      if (hasUnsavedChanges && grid.length > 0) {
        saveCurrentCharacter()
        saveAllDataToLocalStorage()
      }
    }
  }, [hasUnsavedChanges, grid])

  // Add this effect to handle page unload events
  useEffect(() => {
    const handleBeforeUnload = () => {
      if (hasUnsavedChanges && grid.length > 0) {
        saveCurrentCharacter()
        saveAllDataToLocalStorage()
      }
    }

    window.addEventListener("beforeunload", handleBeforeUnload)
    return () => window.removeEventListener("beforeunload", handleBeforeUnload)
  }, [hasUnsavedChanges, grid])

  // Calculate cell size based on container width
  useEffect(() => {
    const updateCellSize = () => {
      if (gridRef.current) {
        const containerWidth = gridRef.current.offsetWidth
        const padding = 32 // 16px padding on each side
        const gap = GRID_SIZES[selectedSize].width - 1 // 1px gap between cells
        const availableWidth = Math.min(containerWidth - padding - gap, 500) // Max width of 500px
        const newCellSize = Math.floor(availableWidth / GRID_SIZES[selectedSize].width)
        setCellSize(Math.min(Math.max(newCellSize, 24), 40)) // Min 24px, Max 40px
      }
    }

    updateCellSize()
    window.addEventListener("resize", updateCellSize)
    return () => window.removeEventListener("resize", updateCellSize)
  }, [selectedSize])

  // Utility functions
  const saveUserPreferences = (key: string, value: any): void => {
    try {
      localStorage.setItem(`bitmap-font-pref-${key}`, JSON.stringify(value))
    } catch (e) {
      console.error("Error saving user preferences", e)
    }
  }

  const getUserPreferences = <T,>(key: string, defaultValue: T): T => {
    try {
      const value = localStorage.getItem(`bitmap-font-pref-${key}`)
      return value ? JSON.parse(value) : defaultValue
    } catch (e) {
      console.error("Error getting user preferences", e)
      return defaultValue
    }
  }

  const getAllFontData = (size: FontSize): FontData => {
    const chars = new Map<number, FontCharacter>()
    const keys = Object.keys(localStorage)

    // Check all keys that match the pattern for this font size
    const pattern = `bitmap-font-${size.width}x${size.height}-`
    for (const key of keys) {
      if (key.startsWith(pattern)) {
        const charCodeMatch = key.match(/bitmap-font-\d+x\d+-(\d+)$/)
        if (charCodeMatch) {
          const charCode = Number.parseInt(charCodeMatch[1], 10)
          const charGrid = getFontCharacter(size, charCode)
          if (charGrid) {
            chars.set(charCode, {
              grid: charGrid,
              lastModified: Date.now()
            })
          }
        }
      }
    }

    return {
      characters: chars,
      sizes: fontData.sizes,
      lastSync: Date.now()
    }
  }

  const getFontCharacter = (size: FontSize, charCode: number): boolean[][] | null => {
    try {
      const storageKey = `bitmap-font-${size.width}x${size.height}-${charCode}`
      const data = localStorage.getItem(storageKey)
      if (!data) return null

      const parsed = JSON.parse(data)
      if (!parsed.grid) return null

      // Validate grid structure
      const grid = parsed.grid
      if (!Array.isArray(grid) || grid.length !== size.height) return null
      if (!grid.every(row => Array.isArray(row) && row.length === size.width)) return null
      if (!grid.every(row => row.every((cell: unknown) => typeof cell === 'boolean'))) return null

      return grid
    } catch (error) {
      console.warn(`Error getting font character ${charCode}:`, error)
      return null
    }
  }

  const characterExistsInAnySize = (charCode: number): FontSize[] => {
    // Use the fontKeysMap instead of directly accessing localStorage
    return fontData.sizes.get(charCode) || []
  }

  // Convert character to new size
  const convertCharacterToNewSize = (
    charCode: number,
    sourceSize: FontSize,
    targetSize: FontSize,
  ): boolean[][] | null => {
    const sourceChar = getFontCharacter(sourceSize, charCode)
    if (!sourceChar) return null

    // Create new grid with target dimensions
    const newGrid = Array(targetSize.height)
      .fill(0)
      .map(() => Array(targetSize.width).fill(false))

    // Calculate scaling factors
    const scaleX = targetSize.width / sourceSize.width
    const scaleY = targetSize.height / sourceSize.height

    // Map each cell from source to target
    for (let y = 0; y < sourceSize.height; y++) {
      for (let x = 0; x < sourceSize.width; x++) {
        const targetX = Math.floor(x * scaleX)
        const targetY = Math.floor(y * scaleY)
        if (targetX < targetSize.width && targetY < targetSize.height) {
          newGrid[targetY][targetX] = sourceChar[y][x]
        }
      }
    }

    return newGrid
  }

  const getAllDefinedCharacters = (): number[] => {
    const charCodes = new Set<number>()
    const keys = Object.keys(localStorage)

    for (const key of keys) {
      if (key.startsWith("bitmap-font-")) {
        const charCodeMatch = key.match(/bitmap-font-\d+x\d+-(\d+)$/)
        if (charCodeMatch) {
          charCodes.add(Number.parseInt(charCodeMatch[1], 10))
        }
      }
    }

    // Update fontKeysMap while we're scanning localStorage
    updateFontKeysMap()
    
    return Array.from(charCodes).sort((a, b) => a - b)
  }

  const saveClipboardData = (grid: boolean[][]): void => {
    try {
      localStorage.setItem("bitmap-font-clipboard", JSON.stringify(grid))
    } catch (e) {
      console.error("Error saving clipboard data", e)
    }
  }

  const getClipboardData = (): boolean[][] | null => {
    try {
      const data = localStorage.getItem("bitmap-font-clipboard")
      return data ? JSON.parse(data) : null
    } catch (e) {
      console.error("Error getting clipboard data", e)
      return null
    }
  }

  // Export font data
  const exportFontData = (gridSize: GridSize): string => {
    const currentSize = GRID_SIZES[gridSize]
    
    // Create proper format that BitmapText can consume
    const data = {
      size: currentSize,
      format: "base64",
      characters: Array.from(fontData.characters.entries()).map(([code, char]) => ({
        charCode: code,
        char: String.fromCharCode(code),
        data: binaryToBase64(gridToBinary(char.grid))
      }))
    }

    return JSON.stringify(data, null, 2)
  }

  // Export all font data
  const exportAllData = () => {
    const allFontData = Object.entries(GRID_SIZES).map(([key, size]) => ({
      size: GRID_SIZES[key as GridSize],
      format: "base64",
      characters: Array.from(fontData.characters.entries())
        .filter(([_, char]) => char.grid.length === GRID_SIZES[key as GridSize].height && 
                              char.grid[0].length === GRID_SIZES[key as GridSize].width)
        .map(([code, char]) => ({
          charCode: code,
          char: String.fromCharCode(code),
          data: binaryToBase64(gridToBinary(char.grid))
        }))
    }))

    // Create a blob and download link
    const blob = new Blob([JSON.stringify(allFontData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `bitmap-font-all-sizes.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast.success("All font data exported successfully")
  }

  // Add helper function to debug and log font data for debugging
  const debugFontData = (label: string, data: any) => {
    if (!data) {
      console.error(`${label}: No data provided`);
      return;
    }
    
    console.log(`${label}:`, {
      size: data.size,
      format: data.format,
      characterCount: Array.isArray(data.characters) ? data.characters.length : 'Not an array',
      sampleChar: Array.isArray(data.characters) && data.characters.length > 0 ? 
        { charCode: data.characters[0].charCode, char: data.characters[0].char } : 'No characters'
    });
  }

  // Import font data from JSON
  const importFontData = (jsonData: string): { success: boolean; message: string; count: number } => {
    try {
      // Parse the data
      const data = JSON.parse(jsonData)
      debugFontData("Importing font data", data);

      if (!data.size || !data.characters || !Array.isArray(data.characters)) {
        console.error("Invalid data structure:", data)
        return { success: false, message: "Invalid font data format", count: 0 }
      }

      let count = 0

      // Import all characters
      data.characters.forEach((char: any) => {
        if (!char.charCode) {
          console.warn("Skipping character without charCode:", char)
          return
        }

        let grid

        if (data.format === "base64" && char.data) {
          try {
            // Convert from Base64
            console.log(`Processing character ${char.char} (code ${char.charCode})`);
            const binary = base64ToBinary(char.data)
            grid = binaryToGrid(binary, data.size.width, data.size.height)
          } catch (e) {
            console.error(`Failed to convert base64 data for character ${char.charCode}:`, e)
            return
          }
        } else if (char.grid) {
          // Legacy format with direct grid
          grid = char.grid
        } else {
          console.warn(`No valid data format found for character ${char.charCode}`)
          return
        }

        // Save to localStorage
        const storageKey = `bitmap-font-${data.size.width}x${data.size.height}-${char.charCode}`
        localStorage.setItem(storageKey, JSON.stringify({
          grid,
          lastModified: Date.now()
        }))
        count++
      })

      // Update fontKeysMap after importing data
      updateFontKeysMap()

      console.log(`Successfully imported ${count} characters`);
      return {
        success: true,
        message: `Imported ${count} characters successfully`,
        count,
      }
    } catch (error) {
      console.error("Error importing font data:", error)
      return {
        success: false,
        message: error instanceof Error ? error.message : "Invalid JSON data",
        count: 0,
      }
    }
  }

  // Save all data to localStorage
  const saveAllDataToLocalStorage = () => {
    try {
      // We don't need to save all data, just the current character
      const storageKey = `bitmap-font-${GRID_SIZES[selectedSize].width}x${GRID_SIZES[selectedSize].height}-${selectedChar}`
      localStorage.setItem(storageKey, JSON.stringify({
        grid,
        lastModified: Date.now()
      }))
    } catch (error) {
      console.error("Error saving data to localStorage", error)
      toast.error("Failed to save changes")
    }
  }

  const displayCharacters = getDisplayCharacters()

  // Format Unicode character for display
  const formatUnicode = (charCode: number): string => {
    return `U+${charCode.toString(16).toUpperCase().padStart(4, "0")}`
  }

  // Event handlers
  const handleCharSetSelect = (setId: string) => {
    // Don't do anything if selecting the same set
    if (setId === selectedCharSet) return

    // Save current character before switching sets
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    setSelectedCharSet(setId)

    // Select the first character in the set
    let newCharCode: number

    if (setId === "defined" && getAllDefinedCharacters().length > 0) {
      newCharCode = getAllDefinedCharacters()[0]
    } else {
      const range = CHARACTER_RANGES.find((r) => r.id === setId)
      if (!range) return
      newCharCode = range.range[0]
    }

    // Only update if it's a different character
    if (newCharCode !== selectedChar) {
      setSelectedChar(newCharCode)
    }
  }

  const toggleCell = (row: number, col: number) => {
    const newGrid = grid.map((rowArray, r) => rowArray.map((cell, c) => (r === row && c === col ? !cell : cell)))
    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleClear = () => {
    const newGrid = Array(GRID_SIZES[selectedSize].height)
      .fill(0)
      .map(() => Array(GRID_SIZES[selectedSize].width).fill(false))
    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleUndo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1)
      setGrid(history[historyIndex - 1])
      setHasUnsavedChanges(true)
    }
  }

  const handleRedo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1)
      setGrid(history[historyIndex + 1])
      setHasUnsavedChanges(true)
    }
  }

  const handleCopy = () => {
    const gridCopy = [...grid.map((row) => [...row])]
    setClipboard(gridCopy)
    saveClipboardData(gridCopy)
    toast.success("Copied to clipboard")
  }

  const handlePaste = () => {
    if (clipboard) {
      // Adjust for different sizes
      const newGrid = Array(GRID_SIZES[selectedSize].height)
        .fill(0)
        .map((_, y) =>
          Array(GRID_SIZES[selectedSize].width)
            .fill(false)
            .map((_, x) => (y < clipboard.length && x < clipboard[0].length ? clipboard[y][x] : false)),
        )

      setGrid(newGrid)
      setHasUnsavedChanges(true)

      // Add to history
      const newHistory = history.slice(0, historyIndex + 1)
      newHistory.push(newGrid)
      setHistory(newHistory)
      setHistoryIndex(newHistory.length - 1)

      toast.success("Pasted from clipboard")
    }
  }

  const handleFlipHorizontal = () => {
    const newGrid = grid.map((row) => [...row].reverse())
    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleFlipVertical = () => {
    const newGrid = [...grid].reverse()
    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleRotateClockwise = () => {
    const height = grid.length
    const width = grid[0].length
    const newGrid = Array(width)
      .fill(0)
      .map(() => Array(height).fill(false))

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newGrid[x][height - 1 - y] = grid[y][x]
      }
    }

    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleRotateCounterClockwise = () => {
    const height = grid.length
    const width = grid[0].length
    const newGrid = Array(width)
      .fill(0)
      .map(() => Array(height).fill(false))

    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        newGrid[width - 1 - x][y] = grid[y][x]
      }
    }

    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleShiftUp = () => {
    const newGrid = [...grid]
    // Move everything up one row
    for (let y = 0; y < grid.length - 1; y++) {
      newGrid[y] = [...grid[y + 1]]
    }
    // Clear the bottom row
    newGrid[grid.length - 1] = Array(grid[0].length).fill(false)

    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleShiftDown = () => {
    const newGrid = [...grid]
    // Move everything down one row
    for (let y = grid.length - 1; y > 0; y--) {
      newGrid[y] = [...grid[y - 1]]
    }
    // Clear the top row
    newGrid[0] = Array(grid[0].length).fill(false)

    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleShiftLeft = () => {
    const newGrid = grid.map((row) => {
      const newRow = [...row]
      // Move everything left one column
      for (let x = 0; x < row.length - 1; x++) {
        newRow[x] = row[x + 1]
      }
      // Clear the rightmost column
      newRow[row.length - 1] = false
      return newRow
    })

    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handleShiftRight = () => {
    const newGrid = grid.map((row) => {
      const newRow = [...row]
      // Move everything right one column
      for (let x = row.length - 1; x > 0; x--) {
        newRow[x] = row[x - 1]
      }
      // Clear the leftmost column
      newRow[0] = false
      return newRow
    })

    setGrid(newGrid)
    setHasUnsavedChanges(true)

    // Add to history
    const newHistory = history.slice(0, historyIndex + 1)
    newHistory.push(newGrid)
    setHistory(newHistory)
    setHistoryIndex(newHistory.length - 1)
  }

  const handlePrevChar = () => {
    // Save current character before navigating
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    const currentIndex = displayCharacters.indexOf(selectedChar)
    if (currentIndex > 0) {
      const prevChar = displayCharacters[currentIndex - 1]
      setSelectedChar(prevChar)
    } else if (selectedCharSet !== "defined") {
      // Find the previous character set
      const currentSetIndex = CHARACTER_RANGES.findIndex((r) => r.id === selectedCharSet)
      if (currentSetIndex > 0) {
        const prevSet = CHARACTER_RANGES[currentSetIndex - 1]
        setSelectedCharSet(prevSet.id)
        const lastChar = prevSet.range[1]
        setSelectedChar(lastChar)
      }
    }
  }

  const handleNextChar = () => {
    // Save current character before navigating
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    const currentIndex = displayCharacters.indexOf(selectedChar)
    if (currentIndex < displayCharacters.length - 1) {
      const nextChar = displayCharacters[currentIndex + 1]
      setSelectedChar(nextChar)
    } else if (selectedCharSet !== "defined") {
      // Find the next character set
      const currentSetIndex = CHARACTER_RANGES.findIndex((r) => r.id === selectedCharSet)
      if (currentSetIndex < CHARACTER_RANGES.length - 1) {
        const nextSet = CHARACTER_RANGES[currentSetIndex + 1]
        setSelectedCharSet(nextSet.id)
        const firstChar = nextSet.range[0]
        setSelectedChar(firstChar)
      }
    }
  }

  const handleSave = () => {
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }
  }

  const handleSizeChange = (size: GridSize) => {
    const newSize = GRID_SIZES[size]
    // Save current character if there are changes
    if (hasUnsavedChanges && grid.length > 0) {
      saveCurrentCharacter()
    }

    // Try to load or convert character for new size
    const charData = fontData.characters.get(selectedChar)
    if (charData) {
      setGrid(charData.grid)
      setHistory([charData.grid])
      setHistoryIndex(0)
    } else {
      // Check if character exists in other sizes
      const sizes = fontData.sizes.get(selectedChar) || []
      if (sizes.length > 0) {
        // Find a size to convert from
        const sourceSize = sizes[0]
        const convertedGrid = convertCharacterToNewSize(selectedChar, sourceSize, newSize)

        if (convertedGrid) {
          setGrid(convertedGrid)
          setHistory([convertedGrid])
          setHistoryIndex(0)
          toast.info(`Converted from ${sourceSize.width}x${sourceSize.height} grid`)
        } else {
          // Create empty grid if conversion fails
          const emptyGrid = Array(newSize.height)
            .fill(0)
            .map(() => Array(newSize.width).fill(false))
          setGrid(emptyGrid)
          setHistory([emptyGrid])
          setHistoryIndex(0)
        }
      } else {
        // Create empty grid if no existing sizes
        const emptyGrid = Array(newSize.height)
          .fill(0)
          .map(() => Array(newSize.width).fill(false))
        setGrid(emptyGrid)
        setHistory([emptyGrid])
        setHistoryIndex(0)
      }
    }

    setSelectedSize(size)
  }

  const handleRangeToggle = (rangeId: string) => {
    setSelectedRanges((prev) => {
      if (prev.includes(rangeId)) {
        return prev.filter((id) => id !== rangeId)
      } else {
        return [...prev, rangeId]
      }
    })
  }

  // Import all font data
  const importAllData = () => {
    try {
      const allFontData = JSON.parse(importData)
      if (!Array.isArray(allFontData)) {
        throw new Error("Invalid font data format")
      }

      let totalImported = 0
      for (const fontData of allFontData) {
        // Check if we have a valid structure
        if (!fontData.size || !fontData.format || !Array.isArray(fontData.characters)) {
          console.error("Invalid font data structure:", fontData)
          continue
        }
        
        // Import using the font data directly, not nested in "data" property
        const result = importFontData(JSON.stringify(fontData))
        if (result.success) {
          totalImported += result.count
        }
      }

      // Reload font data for current size
      const data = getAllFontData(GRID_SIZES[selectedSize])
      setFontData(data)

      // Create the font data object for rendering with proper format
      const fontDataObj = {
        size: GRID_SIZES[selectedSize],
        format: "base64",
        characters: Array.from(data.characters.entries()).map(([code, char]) => ({
          charCode: code,
          char: String.fromCharCode(code),
          data: binaryToBase64(gridToBinary(char.grid))
        }))
      }

      // Cache the font data object
      setCachedFontData(fontDataObj)

      // Update font keys map
      updateFontKeysMap()

      toast.success(`Imported ${totalImported} characters across all sizes`)
      setImportData("")
    } catch (error) {
      console.error("Error importing font data:", error)
      toast.error(error instanceof Error ? error.message : "Failed to import font data")
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between gap-4 mb-4">
        <div className="flex items-center gap-2">
          <Tabs 
            defaultValue={GridSize.MEDIUM}
            className="w-full" 
            onValueChange={(value) => handleSizeChange(value as GridSize)}
          >
            <TabsList className="h-8">
              {Object.entries(GRID_SIZES).map(([key, size]) => (
                <TabsTrigger
                  key={key}
                  value={key}
                  className="h-8 px-3"
                >
                  {GRID_SIZE_LABELS[key as GridSize]}
                </TabsTrigger>
              ))}
            </TabsList>
          </Tabs>
        </div>

        <div className="flex items-center gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
          >
            <Save className="h-4 w-4 mr-1" />
            Save
          </Button>
          <Button variant="outline" onClick={exportAllData}>
            <Download className="w-4 h-4 mr-2" />
            Export Font
          </Button>

          <Dialog>
            <DialogTrigger asChild>
              <Button variant="outline">
                <Upload className="w-4 h-4 mr-2" />
                Import Font
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Import Font Data</DialogTitle>
              </DialogHeader>
              <div className="grid gap-4">
                <Textarea
                  placeholder="Paste JSON font data here..."
                  value={importData}
                  onChange={(e) => setImportData(e.target.value)}
                  className="font-mono text-sm max-h-[500px] overflow-y-auto"
                  rows={10}
                />
                <Button onClick={importAllData}>Import</Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <Card className="p-4">
        <div className="space-y-4">
          {/* Character Groups */}
          <div className="space-y-1">
            {CHARACTER_RANGES.map((range) => {
              const chars = Array.from(
                { length: range.range[1] - range.range[0] + 1 },
                (_, i) => i + range.range[0]
              )

              if (chars.length === 0) return null

              return (
                <div key={range.id} className="space-y-0.5">
                  <div className="flex items-center gap-1">
                    <h3 className="text-xs font-medium">{range.name}</h3>
                  </div>
                  <ScrollArea className="w-full">
                    <div className="flex space-x-0.5 p-0.5">
                      {chars.map((charCode) => {
                        const hasData = fontData.characters.has(charCode)
                        const existsInOtherSizes = characterExistsInAnySize(charCode).length > 0 && !hasData
                        let charDisplay
                        try {
                          charDisplay = String.fromCharCode(charCode)
                        } catch (e) {
                          charDisplay = "?"
                        }

                        return (
                          <div
                            key={charCode}
                            className={`
                              flex flex-col items-center justify-center p-0.5 border cursor-pointer min-w-[2.5rem]
                              ${charCode === selectedChar ? "border-primary" : "border-border"}
                              ${hasData ? "bg-primary/20 dark:bg-primary/40" : existsInOtherSizes ? "bg-yellow-50/20 dark:bg-yellow-900/10" : ""}
                              hover:bg-primary/30 dark:hover:bg-primary/50
                              active:scale-95 transition-transform
                            `}
                            onClick={() => handleCharSelect(charCode)}
                          >
                            <div className="text-[10px] text-muted-foreground mb-0.5">{charDisplay}</div>
                            <div className="flex items-center justify-center h-6">
                              {hasData ? (
                                <BitmapText
                                  text={charDisplay}
                                  fontData={cachedFontData || createFontDataObject()}
                                  scale={1.5}
                                  letterSpacing={0}
                                />
                              ) : null}
                            </div>
                            {existsInOtherSizes && (
                              <div className="absolute top-0.5 right-0.5">
                                <AlertCircle className="h-2 w-2 text-yellow-500" />
                              </div>
                            )}
                          </div>
                        )
                      })}
                    </div>
                    <ScrollBar orientation="horizontal" />
                  </ScrollArea>
                </div>
              )
            })}
          </div>

          {/* Sentence Preview */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-medium">Preview</h3>
              <div className="flex items-center gap-2">
                <Label htmlFor="letter-spacing" className="text-sm">Letter Spacing:</Label>
                <Slider
                  id="letter-spacing"
                  min={-2}
                  max={4}
                  step={1}
                  value={[letterSpacing]}
                  onValueChange={(value) => setLetterSpacing(value[0])}
                  className="w-32"
                />
                <span className="text-sm text-muted-foreground">{letterSpacing}</span>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Input
                placeholder="Enter text to preview..."
                value={testSentence}
                onChange={(e) => setTestSentence(e.target.value)}
                className="flex-1"
              />
            </div>
            <div className="flex items-center justify-center bg-background dark:bg-muted p-4 border rounded-md">
              {!isLoading ? (
                <BitmapText
                  text={testSentence}
                  fontData={cachedFontData || createFontDataObject()}
                  scale={2}
                  letterSpacing={letterSpacing}
                />
              ) : (
                <div className="h-32 flex items-center justify-center">Loading preview...</div>
              )}
            </div>
          </div>

          {/* Editor Section */}
          <div className="grid gap-4 md:grid-cols-2">
            <div className="space-y-4">
              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="icon" onClick={handleUndo} disabled={historyIndex <= 0}>
                  <Undo className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="icon"
                  onClick={handleRedo}
                  disabled={historyIndex >= history.length - 1}
                >
                  <Redo className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleClear}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleCopy}>
                  <Copy className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handlePaste} disabled={!clipboard}>
                  <Paste className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleFlipHorizontal}>
                  <FlipHorizontal className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleFlipVertical}>
                  <FlipVertical className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleRotateClockwise}>
                  <RotateCw className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleRotateCounterClockwise}>
                  <RotateCcw className="h-4 w-4" />
                </Button>
              </div>

              <div className="flex flex-wrap gap-2">
                <Button variant="outline" size="icon" onClick={handleShiftUp}>
                  <ArrowUp className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShiftDown}>
                  <ArrowDown className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShiftLeft}>
                  <ArrowLeft className="h-4 w-4" />
                </Button>
                <Button variant="outline" size="icon" onClick={handleShiftRight}>
                  <ArrowRight className="h-4 w-4" />
                </Button>
              </div>

              <div ref={gridRef}>
                <div
                  className={`
                    grid gap-px bg-border mx-auto grid-lines
                    ${showBaseline ? "baseline-guide" : ""}
                  `}
                  style={
                    {
                      gridTemplateColumns: `repeat(${GRID_SIZES[selectedSize].width}, minmax(0, 1fr))`,
                      width: `${cellSize * GRID_SIZES[selectedSize].width}px`,
                      "--baseline-position": `${baselinePosition * cellSize}px`,
                    } as React.CSSProperties
                  }
                >
                  {grid.map((row, rowIndex) =>
                    row.map((cell, colIndex) => (
                      <div
                        key={`${rowIndex}-${colIndex}`}
                        className={`
                          cursor-pointer 
                          transition-all
                          active:scale-90
                          ${cell ? "bg-primary" : "bg-background hover:bg-primary/20"}
                        `}
                        style={{
                          width: `${cellSize}px`,
                          height: `${cellSize}px`,
                        }}
                        onClick={() => toggleCell(rowIndex, colIndex)}
                      />
                    )),
                  )}
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-center bg-background dark:bg-muted p-4 border rounded-md">
                  {!isLoading ? (
                    <BitmapText
                      text={String.fromCharCode(selectedChar)}
                      fontData={cachedFontData || createFontDataObject()}
                      scale={8}
                      letterSpacing={0}
                    />
                  ) : (
                    <div className="h-32 flex items-center justify-center">Loading preview...</div>
                  )}
                </div>

                <div className="space-y-4">
                  <h3 className="text-sm font-medium">Character Information</h3>
                  <div className="grid grid-cols-2 gap-2 text-sm">
                    <div className="text-muted-foreground">Character:</div>
                    <div>
                      {(() => {
                        try {
                          return String.fromCharCode(selectedChar)
                        } catch (e) {
                          return "?"
                        }
                      })()}
                    </div>

                    <div className="text-muted-foreground">Unicode:</div>
                    <div>{formatUnicode(selectedChar)}</div>

                    <div className="text-muted-foreground">Decimal:</div>
                    <div>{selectedChar}</div>

                    <div className="text-muted-foreground">Size:</div>
                    <div>
                      {GRID_SIZES[selectedSize].width}×{GRID_SIZES[selectedSize].height}
                    </div>

                    <div className="text-muted-foreground">Pixels:</div>
                    <div>{grid.flat().filter(Boolean).length}</div>

                    <div className="text-muted-foreground">Status:</div>
                    <div>
                      {hasUnsavedChanges ? (
                        <span className="text-yellow-600 dark:text-yellow-400">Unsaved changes</span>
                      ) : (
                        <span className="text-green-600 dark:text-green-400">Saved</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </Card>
    </div>
  )
}

