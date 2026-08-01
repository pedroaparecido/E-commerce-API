import { prisma } from '@/lib/prisma'

// Interface representando a resposta típica de uma API de Dropshipping
interface ExternalSupplierProduct {
  supplier_id: string
  sku: string
  title: string
  description: string
  cost_price: number // Preço de custo no fornecedor
  category_name: string
  category_slug: string
  images: string[]
  variants: Array<{
    sku: string
    name: string
    cost_price: number
    stock: number
  }>
  attributes: Record<string, any>
}

export class DropshippingService {
  private PROFIT_MARGIN = 1.5 // Aplica 50% de margem sobre o preço de custo

  // Mapeia e salva um único produto da API no PostgreSQL
  async syncSingleProduct(supplierProduct: ExternalSupplierProduct) {
    const retailPrice = Number((supplierProduct.cost_price * this.PROFIT_MARGIN).toFixed(2))
    const slug = this.generateSlug(supplierProduct.title)

    // 1. Garante que a categoria existe no banco
    const category = await prisma.category.upsert({
      where: { slug: supplierProduct.category_slug },
      update: { name: supplierProduct.category_name },
      create: {
        name: supplierProduct.category_name,
        slug: supplierProduct.category_slug,
      },
    })

    // 2. Insere ou atualiza o produto (baseado no SKU do fornecedor)
    const product = await prisma.product.upsert({
      where: { slug }, // ou via campo indexado único
      update: {
        name: supplierProduct.title,
        description: supplierProduct.description,
        price: retailPrice,
        supplierPrice: supplierProduct.cost_price,
        supplierSku: supplierProduct.sku,
        supplierId: supplierProduct.supplier_id,
        attributes: supplierProduct.attributes,
        categoryId: category.id,
      },
      create: {
        name: supplierProduct.title,
        slug,
        description: supplierProduct.description,
        price: retailPrice,
        supplierPrice: supplierProduct.cost_price,
        supplierSku: supplierProduct.sku,
        supplierId: supplierProduct.supplier_id,
        attributes: supplierProduct.attributes,
        categoryId: category.id,
      },
    })

    // 3. Atualiza as imagens (deleta antigas e insere novas para sincronizar)
    await prisma.productImage.deleteMany({ where: { productId: product.id } })
    if (supplierProduct.images.length > 0) {
      await prisma.productImage.createMany({
        data: supplierProduct.images.map((url) => ({
          url,
          productId: product.id,
          altText: supplierProduct.title,
        })),
      })
    }

    // 4. Sincroniza as variações (SKUs de cores, tamanhos, etc.)
    for (const variant of supplierProduct.variants) {
      const variantRetailPrice = Number((variant.cost_price * this.PROFIT_MARGIN).toFixed(2))

      await prisma.productVariant.upsert({
        where: { sku: variant.sku },
        update: {
          name: variant.name,
          price: variantRetailPrice,
          stockQuantity: variant.stock,
        },
        create: {
          sku: variant.sku,
          name: variant.name,
          price: variantRetailPrice,
          stockQuantity: variant.stock,
          productId: product.id,
        },
      })
    }

    return product
  }

  // Método para sincronizar uma lista inteira recebida da API
  async syncCatalogFromApi(productsFromApi: ExternalSupplierProduct[]) {
    const results = []

    for (const supplierProduct of productsFromApi) {
      const syncedProduct = await this.syncSingleProduct(supplierProduct)
      results.push(syncedProduct)
    }

    return { totalSynced: results.length }
  }

  private generateSlug(text: string): string {
    return text
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .replace(/[^\w\s-]/g, '')
      .replace(/\s+/g, '-')
  }
}