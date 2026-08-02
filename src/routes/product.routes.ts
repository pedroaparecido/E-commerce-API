import { FastifyInstance } from 'fastify'
import { prisma } from '@/lib/prisma'

export async function productRoutes(app: FastifyInstance) {
  app.get('/products', async (request, reply) => {
    // Busca os produtos cadastrados via Dropshipping com imagens e categorias
    const products = await prisma.product.findMany({
      include: {
        images: true,
        category: true,
        variants: true,
      },
      orderBy: {
        createdAt: 'desc',
      },
    })

    // Mapeia o retorno do banco para a interface `Product` esperada pelo seu Frontend
    const formattedProducts = products.map((prod) => {
      // Calcula o estoque total somando as variações (SKUs)
      const totalStock = prod.variants.reduce(
        (acc, variant) => acc + variant.stockQuantity,
        0
      )

      return {
        id: prod.id,
        title: prod.name,
        price: Number(prod.price),
        originalPrice: prod.supplierPrice ? Number(prod.supplierPrice) * 1.3 : undefined,
        rating: 4.9, // Valor fictício ou default enquanto não houver módulo de avaliações
        reviewsCount: 18,
        category: prod.category?.name || 'Geral',
        imageUrl:
          prod.images[0]?.url ||
          'https://images.unsplash.com/photo-1505740420928-5e560c06d30e?w=500&q=80',
        stockQuantity: totalStock,
        isExclusive: Number(prod.price) > 300,
      }
    })

    return formattedProducts
  })
}