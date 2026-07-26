export const RoleStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type RoleStatus = (typeof RoleStatus)[keyof typeof RoleStatus];

export const MediaType = {
  IMAGE: 'IMAGE',
  VIDEO: 'VIDEO',
  DOCUMENT: 'DOCUMENT',
} as const;
export type MediaType = (typeof MediaType)[keyof typeof MediaType];

export const BrandStatus = {
  ACTIVE: 'ACTIVE',
  INACTIVE: 'INACTIVE',
} as const;
export type BrandStatus = (typeof BrandStatus)[keyof typeof BrandStatus];

export const AttributeType = {
  DROPDOWN: 'DROPDOWN',
  RADIO: 'RADIO',
  CHECKBOX: 'CHECKBOX',
  COLOUR_SWATCH: 'COLOUR_SWATCH',
  IMAGE_SWATCH: 'IMAGE_SWATCH',
} as const;
export type AttributeType = (typeof AttributeType)[keyof typeof AttributeType];

export const StockStatus = {
  IN_STOCK: 'IN_STOCK',
  OUT_OF_STOCK: 'OUT_OF_STOCK',
  ON_BACKORDER: 'ON_BACKORDER',
} as const;
export type StockStatus = (typeof StockStatus)[keyof typeof StockStatus];
