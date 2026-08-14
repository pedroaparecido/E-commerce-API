import { prisma } from '@/lib/prisma'
import { CJDropshippingService, CJProductResponse } from './cj-dropshipping.service'

export interface ExternalSupplierProduct {
  supplier_id: string
  sku: string
  title: string
  description: string
  cost_price: number
  category_name: string
  category_slug: string
  images: string[]
  variants: Array<{
    sku: string
    name: string
    cost_price: number
    stock: number
  }>
}

export class DropshippingService {
  private cjService: CJDropshippingService
  private defaultMarkup: number

  private WINNING_KEYWORDS = [
    // Eletrônicos & Smart Gadgets
    'smartwatch', 'smart band', 'fitness tracker', 'wireless earphones', 
    'bluetooth headphones', 'tws earbuds', 'power bank', 'wireless charger',
    // Casa & Cozinha
    'vegetable chopper', 'electric slicer', 'portable blender', 'mini food processor',
    'milk frother', 'digital kitchen scale', 'air fryer accessories',
    // Iluminação & Decoração
    'sunset lamp', 'led strip lights', 'humidifier diffuser', 'galaxy projector',
    // Cuidados Pessoais
    'neck massager', 'posture corrector', 'hair remover', 'massage gun'
  ]

  constructor() {
    this.cjService = new CJDropshippingService()
    this.defaultMarkup = Number(process.env.SUPPLIER_DEFAULT_MARKUP) || 2.5
  }

  private parsePrice(rawPrice: any): number {
    if (typeof rawPrice === 'number' && !isNaN(rawPrice)) return rawPrice
    if (typeof rawPrice === 'string') {
      const matches = rawPrice.match(/[\d.]+/g)
      if (matches && matches.length > 0) {
        const parsed = parseFloat(matches[0])
        if (!isNaN(parsed)) return parsed
      }
    }
    return 12.0
  }

  private cleanTitle(titleEn?: string, titleName?: string): string {
    const raw = titleEn || titleName || ''
    let title = raw.trim()

    if (title.startsWith('[') || title.startsWith('{')) {
      try {
        const parsed = JSON.parse(title)
        if (Array.isArray(parsed) && parsed.length > 0) title = String(parsed[0])
      } catch {}
    }

    title = title.replace(/[\x00-\x1F\x7F-\x9F]/g, '').trim()
    return title || 'Produto Destaque'
  }

  private generateSlug(text: string, idSuffix?: string): string {
    const baseSlug = text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
      .replace(/(^-|-$)+/g, '')

    if (idSuffix) {
      return baseSlug ? `${baseSlug}-${idSuffix}` : `item-${idSuffix}`
    }
    return baseSlug || 'geral'
  }

  /**
   * 1. Sincronização Massiva (Centenas de produtos de vários nichos)
   */
  async syncMassiveCatalog(pagesPerKeyword = 2, itemsPerPage = 30) {
    let totalSynced = 0
    let totalErrors = 0
    const summaryByKeyword: Record<string, number> = {}

    for (const keyword of this.WINNING_KEYWORDS) {
      summaryByKeyword[keyword] = 0

      for (let page = 1; page <= pagesPerKeyword; page++) {
        const items = await this.cjService.fetchProductsByKeyword(keyword, page, itemsPerPage)
        if (items.length === 0) break

        for (const rawItem of items) {
          try {
            await this.processAndSaveProduct(rawItem, keyword)
            totalSynced++
            summaryByKeyword[keyword]++
          } catch (error: any) {
            totalErrors++
          }
        }
      }
    }

    return {
      totalSynced,
      totalErrors,
      keywordsProcessed: this.WINNING_KEYWORDS.length,
      summaryByKeyword,
    }
  }

  /**
   * 2. Sincronização de Produtos Campeões (Apenas os top 3 termos rápidos)
   */
  async syncWinningProducts() {
    const quickKeywords = ['smartwatch', 'earphones', 'chopper']
    let totalSynced = 0

    for (const keyword of quickKeywords) {
      const items = await this.cjService.fetchProductsByKeyword(keyword, 1, 10)
      for (const rawItem of items) {
        await this.processAndSaveProduct(rawItem, keyword)
        totalSynced++
      }
    }

    return { totalSynced }
  }

  /**
   * 3. Sincronização por Categoria Específica
   */
  async syncCatalogByCategory(categoryQuery: string) {
    const rawProducts = await this.cjService.fetchProductsByCategory(categoryQuery, 1, 15)
    let syncedCount = 0

    for (const rawItem of rawProducts) {
      await this.processAndSaveProduct(rawItem, categoryQuery)
      syncedCount++
    }

    return {
      categorySynced: categoryQuery,
      totalReceived: rawProducts.length,
      totalSynced: syncedCount,
    }
  }

  private async processAndSaveProduct(rawItem: CJProductResponse, defaultCategory = 'Geral') {
    const title = this.cleanTitle(rawItem.productNameEn, rawItem.productName)
    const costPrice = this.parsePrice(rawItem.sellPrice)

    const categoryName = rawItem.categoryName || defaultCategory
    const categorySlug = this.generateSlug(categoryName)

    let variants = rawItem.variants?.map((v) => ({
      sku: v.variantSku || `${rawItem.productSku}-${Math.random().toString(36).substring(7)}`,
      name: this.cleanTitle(v.variantNameEn, v.variantName || v.variantStandard || 'Modelo Padrão'),
      cost_price: this.parsePrice(v.variantSellPrice) || costPrice,
      stock: 100,
    })) || []

    if (variants.length === 0) {
      variants = [
        {
          sku: `${rawItem.productSku}-DEF`,
          name: 'Modelo Padrão',
          cost_price: costPrice,
          stock: 100,
        },
      ]
    }

    const formattedProduct: ExternalSupplierProduct = {
      supplier_id: rawItem.pid,
      sku: rawItem.productSku,
      title,
      description: `Produto de alta demanda: ${title}. Qualidade garantida.`,
      cost_price: costPrice,
      category_name: categoryName,
      category_slug: categorySlug,
      images: rawItem.productImage ? [rawItem.productImage] : [],
      variants,
    }

    await this.syncSingleProduct(formattedProduct)
  }

  async syncSingleProduct(supplierProduct: ExternalSupplierProduct) {
  const costPrice = this.parsePrice(supplierProduct.cost_price)
  const retailPrice = Number((costPrice * this.defaultMarkup).toFixed(2))
  const title = supplierProduct.title
  const slug = this.generateSlug(title, supplierProduct.supplier_id)

  // 1. Categoria
  const category = await prisma.category.upsert({
    where: { slug: supplierProduct.category_slug },
    update: { name: supplierProduct.category_name },
    create: {
      name: supplierProduct.category_name,
      slug: supplierProduct.category_slug,
    },
  })

  // 2. Produto Pai
  const product = await prisma.product.upsert({
    where: { slug },
    update: {
      name: title,
      description: supplierProduct.description,
      price: retailPrice,
      supplierPrice: costPrice,
      supplierSku: supplierProduct.sku,
      supplierId: supplierProduct.supplier_id,
      category: { connect: { id: category.id } },
    },
    create: {
      name: title,
      slug,
      description: supplierProduct.description,
      price: retailPrice,
      sku: supplierProduct.sku,
      supplierPrice: costPrice,
      supplierSku: supplierProduct.sku,
      supplierId: supplierProduct.supplier_id,
      category: { connect: { id: category.id } },
    },
  })

  // 3. Imagens
  await prisma.productImage.deleteMany({ where: { productId: product.id } })
  if (supplierProduct.images.length > 0) {
    await prisma.productImage.createMany({
      data: supplierProduct.images.map((url) => ({
        url,
        productId: product.id,
        altText: title,
      })),
    })
  }

  // 4. Criação/Atualização das Variantes (Aqui elas ganham o ID do banco)
  for (const variant of supplierProduct.variants) {
    const variantCost = this.parsePrice(variant.cost_price)
    const variantRetailPrice = Number((variantCost * this.defaultMarkup).toFixed(2))

    await prisma.productVariant.upsert({
      where: { sku: variant.sku },
      update: {
        name: variant.name,
        price: variantRetailPrice,
        stockQuantity: variant.stock > 0 ? variant.stock : 100,
      },
      create: {
        sku: variant.sku,
        name: variant.name,
        price: variantRetailPrice,
        stockQuantity: variant.stock > 0 ? variant.stock : 100,
        product: { connect: { id: product.id } },
      },
    })
  }

  return product
}
}