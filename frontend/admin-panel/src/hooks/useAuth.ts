import { useState, useEffect } from 'react';
import { useAccount, useSignMessage } from 'wagmi';
import { SiweMessage } from 'siwe';
import { api } from '../lib/api';

const PLATFORM_ADDRESS = import.meta.env.VITE_PLATFORM_ADDRESS?.toLowerCase() || '';

export function useAuth() {
  const { address, isConnected } = useAccount();
  const { signMessageAsync } = useSignMessage();
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [isPlatformAdmin, setIsPlatformAdmin] = useState(false);
  const [isAuthenticating, setIsAuthenticating] = useState(false);
  const [admin, setAdmin] = useState<any>(null);

  useEffect(() => {
    checkSession();
  }, []);

  useEffect(() => {
    if (address && isConnected) {
      const isPlatform = address.toLowerCase() === PLATFORM_ADDRESS;
      setIsPlatformAdmin(isPlatform);

      if (!isPlatform) {
        setIsAuthenticated(false);
        setAdmin(null);
      }
    } else {
      setIsAuthenticated(false);
      setIsPlatformAdmin(false);
      setAdmin(null);
    }
  }, [address, isConnected]);

  const checkSession = async () => {
    try {
      const session = await api.getSession();
      if (session && session.walletAddress?.toLowerCase() === PLATFORM_ADDRESS) {
        setIsAuthenticated(true);
        setIsPlatformAdmin(true);
        setAdmin(session);
      }
    } catch (error) {
      setIsAuthenticated(false);
      setIsPlatformAdmin(false);
    }
  };

  const signIn = async () => {
    if (!address || !isPlatformAdmin) {
      throw new Error('Only platform admin can access this panel');
    }

    setIsAuthenticating(true);
    try {
      const nonce = await api.getNonce(address);

      const message = new SiweMessage({
        domain: window.location.host,
        address,
        statement: 'Sign in to PMT Gateway Admin Panel',
        uri: window.location.origin,
        version: '1',
        chainId: 1,
        nonce,
      });

      const signature = await signMessageAsync({
        message: message.prepareMessage(),
      });

      const result = await api.verifySiwe(message.prepareMessage(), signature);

      setAdmin(result.merchant);
      setIsAuthenticated(true);
    } catch (error: any) {
      console.error('Sign in failed:', error);
      throw error;
    } finally {
      setIsAuthenticating(false);
    }
  };

  const signOut = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Sign out failed:', error);
    } finally {
      setIsAuthenticated(false);
      setAdmin(null);
    }
  };

  return {
    isAuthenticated,
    isPlatformAdmin,
    isAuthenticating,
    admin,
    signIn,
    signOut,
  };
}
