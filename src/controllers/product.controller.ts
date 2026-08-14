import { FastifyRequest, FastifyReply } from 'fastify'
import { prisma } from '../lib/prisma'

export class ProductController {
  
  // GET /products - Listagem com busca, filtro e paginação
  async list(request: FastifyRequest, reply: FastifyReply) {
    const { page = '1', limit = '12', search, categorySlug } = request.query as {
      page?: string
      limit?: string
      search?: string
      categorySlug?: string
    }

    const pageNumber = Math.max(1, parseInt(page, 10))
    const limitNumber = Math.min(50, Math.max(1, parseInt(limit, 10))) // Trava no máximo em 50 por página
    const skip = (pageNumber - 1) * limitNumber

    // Monta o filtro dinâmico
    const where: any = {
      active: true, // Apenas produtos ativos no e-commerce
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ]
    }

    if (categorySlug) {
      where.category = {
        slug: categorySlug,
      }
    }

    // Executa busca e contagem em paralelo no banco
    const [products, total] = await Promise.all([
      prisma.product.findMany({
        where,
        take: limitNumber,
        skip,
        // REGRA DE OURO: traga apenas os campos necessários para o card do produto!
        select: {
          id: true,
          name: true,
          slug: true,
          price: true,
          promotionalPrice: true,
          images: {
            take: 1, // Apenas a primeira imagem para o card
            select: { url: true, altText: true },
          },
          category: {
            select: { name: true, slug: true },
          },
        },
        orderBy: {
          createdAt: 'desc',
        },
      }),
      prisma.product.count({ where }),
    ])

    return reply.send({
      data: products,
      pagination: {
        page: pageNumber,
        limit: limitNumber,
        total,
        totalPages: Math.ceil(total / limitNumber),
      },
    })
  }

  // GET /products/:slug - Detalhes do produto
  async getBySlug(request: FastifyRequest, reply: FastifyReply) {
    const { slug } = request.params as { slug: string }

    const product = await prisma.product.findUnique({
      where: { slug },
      include: {
        category: true,
        images: true,
        attributes: true, // Ex: Cor, Tamanho, Voltagem
      },
    })

    if (!product || !product.active) {
      return reply.status(404).send({ message: 'Produto não encontrado.' })
    }

    return reply.send(product)
  }
}