/**
 * API Client for PMT Gateway Backend
 *
 * Handles all communication with the backend API including:
 * - Web3 authentication (SIWE)
 * - Payment intent management
 * - Merchant profile updates
 */

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1'

export class APIError extends Error {
  constructor(
    message: string,
    public statusCode: number,
    public code?: string
  ) {
    super(message)
    this.name = 'APIError'
  }
}

/**
 * API Client
 */
class API {
  private sessionToken: string | null = null

  constructor() {
    // Load session token from localStorage
    this.sessionToken = localStorage.getItem('sessionToken')
  }

  /**
   * Set session token
   */
  setSessionToken(token: string | null) {
    this.sessionToken = token
    if (token) {
      localStorage.setItem('sessionToken', token)
    } else {
      localStorage.removeItem('sessionToken')
    }
  }

  /**
   * Get session token
   */
  getSessionToken(): string | null {
    return this.sessionToken
  }

  /**
   * Make authenticated request
   */
  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<T> {
    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    }

    // Add session token if available
    if (this.sessionToken) {
      headers['X-Session-Token'] = this.sessionToken
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new APIError(
        data.error?.message || 'Request failed',
        response.status,
        data.error?.code
      )
    }

    return data.data
  }

  // ============ Authentication ============

  /**
   * Get nonce for SIWE message
   */
  async getNonce(address: string): Promise<string> {
    const response = await fetch(
      `${API_BASE_URL}/auth/nonce?address=${address}`
    )
    const data = await response.json()
    return data.data.nonce
  }

  /**
   * Verify SIWE signature and create session
   */
  async verifySiwe(message: string, signature: string): Promise<{
    sessionToken: string
    merchant: any
    isNewMerchant: boolean
  }> {
    const result = await this.request<any>('/auth/verify', {
      method: 'POST',
      body: JSON.stringify({ message, signature }),
    })

    // Store session token
    this.setSessionToken(result.sessionToken)

    return result
  }

  /**
   * Get current session
   */
  async getSession(): Promise<any> {
    return this.request('/auth/session')
  }

  /**
   * Logout
   */
  async logout(): Promise<void> {
    await this.request('/auth/logout', { method: 'POST' })
    this.setSessionToken(null)
  }

  // ============ Payment Intents ============

  /**
   * Get payment intents for current merchant
   */
  async getPaymentIntents(params?: {
    page?: number
    limit?: number
    status?: string
    currency?: string
  }): Promise<{
    paymentIntents: any[]
    total: number
    page: number
    limit: number
  }> {
    const queryParams = new URLSearchParams()
    if (params?.page) queryParams.set('page', params.page.toString())
    if (params?.limit) queryParams.set('limit', params.limit.toString())
    if (params?.status) queryParams.set('status', params.status)
    if (params?.currency) queryParams.set('currency', params.currency)

    const query = queryParams.toString()
    return this.request(`/payment-intents${query ? `?${query}` : ''}`)
  }

  /**
   * Get single payment intent
   */
  async getPaymentIntent(id: string): Promise<any> {
    return this.request(`/payment-intents/${id}`)
  }

  /**
   * Create payment intent
   */
  async createPaymentIntent(data: {
    amount: number
    currency: string
    crypto_currency?: string
    metadata?: Record<string, any>
  }): Promise<any> {
    return this.request('/payment-intents', {
      method: 'POST',
      body: JSON.stringify(data),
    })
  }

  /**
   * Confirm payment (manual release)
   */
  async confirmPayment(id: string): Promise<any> {
    return this.request(`/payment-intents/${id}/confirm`, {
      method: 'POST',
    })
  }

  /**
   * Refund payment
   */
  async refundPayment(id: string): Promise<any> {
    return this.request(`/payment-intents/${id}/refund`, {
      method: 'POST',
    })
  }

  /**
   * Cancel payment intent
   */
  async cancelPayment(id: string): Promise<any> {
    return this.request(`/payment-intents/${id}/cancel`, {
      method: 'POST',
    })
  }
}

export const api = new API()
