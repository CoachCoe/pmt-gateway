import { useEffect, useState } from 'react'
import { useAccount, useSignMessage } from 'wagmi'
import { SiweMessage } from 'siwe'
import { api } from '../lib/api'

export interface Merchant {
  id: string
  name: string
  walletAddress: string
  platformFeeBps: number
  payoutSchedule: string
  minPayoutAmount: string
  isActive: boolean
  createdAt: string
}

export function useAuth() {
  const { address, isConnected } = useAccount()
  const { signMessageAsync } = useSignMessage()

  const [merchant, setMerchant] = useState<Merchant | null>(null)
  const [isAuthenticating, setIsAuthenticating] = useState(false)
  const [isNewMerchant, setIsNewMerchant] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Sign in with wallet using SIWE
   */
  const signIn = async () => {
    if (!address || !isConnected) {
      setError('Wallet not connected')
      return
    }

    try {
      setIsAuthenticating(true)
      setError(null)

      // 1. Get nonce from backend
      const nonce = await api.getNonce(address)

      // 2. Create SIWE message
      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to PMT Gateway Merchant Dashboard',
        uri: window.location.origin,
        version: '1',
        chainId: 1, // Ethereum mainnet (SIWE standard)
        nonce,
      })

      const messageString = message.prepareMessage()

      // 3. Sign message with wallet
      const signature = await signMessageAsync({
        message: messageString,
      })

      // 4. Verify signature and create session
      const result = await api.verifySiwe(messageString, signature)

      setMerchant(result.merchant)
      setIsNewMerchant(result.isNewMerchant)

      console.log('✅ Signed in successfully!', {
        merchant: result.merchant.name,
        isNew: result.isNewMerchant,
      })

    } catch (err: any) {
      console.error('Sign in failed:', err)
      setError(err.message || 'Failed to sign in')
    } finally {
      setIsAuthenticating(false)
    }
  }

  /**
   * Sign out
   */
  const signOut = async () => {
    try {
      await api.logout()
      setMerchant(null)
      setIsNewMerchant(false)
    } catch (err) {
      console.error('Sign out failed:', err)
    }
  }

  /**
   * Check if user has active session
   */
  const checkSession = async () => {
    const sessionToken = api.getSessionToken()

    if (!sessionToken) {
      setMerchant(null)
      return
    }

    try {
      const result = await api.getSession()
      setMerchant(result.merchant)
    } catch (err) {
      // Session invalid or expired
      api.setSessionToken(null)
      setMerchant(null)
    }
  }

  /**
   * Auto-check session on mount
   */
  useEffect(() => {
    checkSession()
  }, [])

  /**
   * Auto sign-in when wallet connects (if no session)
   */
  useEffect(() => {
    if (isConnected && address && !merchant && !isAuthenticating) {
      // Only auto sign-in if we have a session token
      const sessionToken = api.getSessionToken()
      if (!sessionToken) {
        // No session, user needs to manually sign in
        return
      }
      checkSession()
    }
  }, [isConnected, address])

  return {
    merchant,
    isAuthenticated: !!merchant,
    isAuthenticating,
    isNewMerchant,
    error,
    signIn,
    signOut,
  }
}
