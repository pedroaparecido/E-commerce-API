export interface ProductImage {
  id: string
  url: string
}

export interface Product {
  id: string
  title: string
  description?: string
  price: number
  stock: number
  slug?: string
  images?: ProductImage[]
}