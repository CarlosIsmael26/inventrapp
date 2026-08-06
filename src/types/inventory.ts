export type InventoryProduct = { id: string; code: string; name: string; brand: string; quantity: number; unitValue: number; createdAt: Date | null; updatedAt: Date | null }
export type InventoryProductInput = Omit<InventoryProduct, 'id' | 'createdAt' | 'updatedAt'>
export type InventoryImportError = { row: number; message: string; code?: string }
export type InventoryImportPreview = { fileName: string; products: InventoryProductInput[]; errors: InventoryImportError[]; duplicateCodes: string[]; existingCodes: string[] }
