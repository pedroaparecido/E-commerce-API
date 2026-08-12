import axios from 'axios'

export interface CJProductResponse {
  pid: string
  productSku: string
  productName: string
  productNameEn?: string
  productImage: string
  sellPrice: number | string
  categoryName?: string
  variants?: Array<{
    vid: string
    variantSku: string
    variantName: string
    variantNameEn?: string
    variantSellPrice: number | string
    variantStandard?: string
  }>
}

export class CJDropshippingService {
  private readonly baseUrl = 'https://developers.cjdropshipping.com/api2.0/v1'
  private accessTokenCache: string | null = null

  async getAccessToken(): Promise<string> {
    if (this.accessTokenCache) return this.accessTokenCache

    const apiKey = process.env.CJ_API_KEY
    if (!apiKey) throw new Error('Variável CJ_API_KEY não configurada no .env')

    try {
      const response = await axios.post(`${this.baseUrl}/authentication/getAccessToken`, { apiKey })
      if (response.data.code !== 200 || !response.data.data?.accessToken) {
        throw new Error(response.data.message || 'Falha ao obter token na CJ')
      }
      this.accessTokenCache = response.data.data.accessToken
      return this.accessTokenCache!
    } catch (error: any) {
      console.error('❌ Erro na autenticação com a CJ:', error.response?.data || error.message)
      throw new Error('Falha ao autenticar na API da CJ Dropshipping.')
    }
  }

  /**
   * Busca produtos por palavra-chave (utilizado na busca massiva e produtos campeões)
   */
  async fetchProductsByKeyword(keyWord: string, page = 1, pageSize = 50): Promise<CJProductResponse[]> {
    try {
      const token = await this.getAccessToken()
      const response = await axios.get(`${this.baseUrl}/product/list`, {
        headers: { 'CJ-Access-Token': token },
        params: { keyWord, pageNum: page, pageSize },
      })

      if (response.data.code !== 200 || !response.data.data?.list) {
        if (response.data.code !== 200) this.accessTokenCache = null
        return []
      }

      return response.data.data.list
    } catch (error: any) {
      console.error(`❌ Erro ao buscar '${keyWord}' (pág ${page}):`, error.message)
      return []
    }
  }

  /**
   * Busca produtos por categoria
   */
  async fetchProductsByCategory(categoryName: string, page = 1, pageSize = 15): Promise<CJProductResponse[]> {
    try {
      const token = await this.getAccessToken()
      const response = await axios.get(`${this.baseUrl}/product/list`, {
        headers: { 'CJ-Access-Token': token },
        params: { categoryName, pageNum: page, pageSize },
      })

      if (response.data.code !== 200 || !response.data.data?.list) {
        if (response.data.code !== 200) this.accessTokenCache = null
        return []
      }

      return response.data.data.list
    } catch (error: any) {
      console.error(`❌ Erro ao buscar categoria '${categoryName}':`, error.message)
      return []
    }
  }
}