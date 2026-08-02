import { describe, it, expect, beforeEach, vi } from 'vitest'
import { DropshippingService } from './dropshipping.service'
import { prisma } from '@/lib/prisma'

// Moca a instância do Prisma para não bater no PostgreSQL real
vi.mock('@/lib/prisma', () => ({
  prisma: {
    category: {
      upsert: vi.fn(),
    },
    product: {
      upsert: vi.fn(),
    },
    productImage: {
      deleteMany: vi.fn(),
      createMany: vi.fn(),
    },
    productVariant: {
      upsert: vi.fn(),
    },
  },
}))

describe('DropshippingService', () => {
  let dropshippingService: DropshippingService

  beforeEach(() => {
    vi.clearAllMocks()
    dropshippingService = new DropshippingService()
  })

  it('deve calcular a margem de lucro de 50% e sincronizar o produto com sucesso', async () => {
    // 1. Arrange (Dados de entrada fictícios do fornecedor)
    const mockSupplierProduct = {
      supplier_id: 'SUPP_001',
      sku: 'SKU-TEST-123',
      title: 'Fone Sem Fio Bluetooth',
      description: 'Fone de ouvido com cancelamento de ruído',
      cost_price: 100.0, // Custo R$ 100,00 -> Preço final esperado: R$ 150,00
      category_name: 'Áudio',
      category_slug: 'audio',
      images: ['https://site.com/foto1.jpg'],
      variants: [
        {
          sku: 'SKU-TEST-123-BLK',
          name: 'Preto',
          cost_price: 100.0,
          stock: 50,
        },
      ],
      attributes: { bluetooth: '5.0' },
    }

    // Configura retornos simulados do Prisma
    vi.mocked(prisma.category.upsert).mockResolvedValue({
      id: 'cat-123',
      name: 'Áudio',
      slug: 'audio',
    } as any)

    vi.mocked(prisma.product.upsert).mockResolvedValue({
      id: 'prod-999',
      name: 'Fone Sem Fio Bluetooth',
      price: 150.0, // 100 * 1.5
      slug: 'fone-sem-fio-bluetooth',
    } as any)

    // 2. Act (Execução do método)
    const result = await dropshippingService.syncSingleProduct(mockSupplierProduct)

    // 3. Assert (Verificações)
    expect(prisma.category.upsert).toHaveBeenCalledWith({
      where: { slug: 'audio' },
      update: { name: 'Áudio' },
      create: { name: 'Áudio', slug: 'audio' },
    })

    expect(prisma.product.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          price: 150.0, // Valida se o markup de 50% foi aplicado
          supplierPrice: 100.0,
          supplierSku: 'SKU-TEST-123',
        }),
      })
    )

    expect(prisma.productVariant.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          price: 150.0,
          stockQuantity: 50,
        }),
      })
    )

    expect(result.id).toBe('prod-999')
  })

  it('deve sincronizar múltiplos produtos de um lote', async () => {
    const mockList = [
      {
        supplier_id: '1',
        sku: 'SKU-1',
        title: 'Item 1',
        description: 'Desc 1',
        cost_price: 20,
        category_name: 'Geral',
        category_slug: 'geral',
        images: [],
        variants: [],
        attributes: {},
      },
      {
        supplier_id: '2',
        sku: 'SKU-2',
        title: 'Item 2',
        description: 'Desc 2',
        cost_price: 40,
        category_name: 'Geral',
        category_slug: 'geral',
        images: [],
        variants: [],
        attributes: {},
      },
    ]

    vi.mocked(prisma.category.upsert).mockResolvedValue({ id: 'c1' } as any)
    vi.mocked(prisma.product.upsert).mockResolvedValue({ id: 'p1' } as any)

    const summary = await dropshippingService.syncCatalogFromApi(mockList)

    expect(summary.totalSynced).toBe(2)
    expect(prisma.product.upsert).toHaveBeenCalledTimes(2)
  })
})