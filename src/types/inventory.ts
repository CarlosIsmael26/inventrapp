export type InventoryProduct = { id: string; code: string; name: string; brand: string; quantity: number; purchasePrice: number; salePrice: number; profitPercentage: number; createdAt: Date | null; updatedAt: Date | null }
export type InventoryProductInput = { code: string; name: string; brand: string; quantity: number; purchasePrice: number }
export type ManualInventoryProductInput = InventoryProductInput & { profitPercentage: number }
export type InventoryImportError = { row: number; message: string; code?: string }
export type InventoryImportPreview = { fileName: string; products: InventoryProductInput[]; errors: InventoryImportError[]; duplicateCodes: string[]; existingCodes: string[] }
