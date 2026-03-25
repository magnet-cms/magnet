'use client'

import { useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'

import { useTokenStorage } from '~/core/provider/MagnetProvider'
import { useAppIntl } from '~/i18n'

/**
 * OAuthCallbackPage
 *
 * The NestJS backend redirects here after a successful OAuth login with tokens
 * in the query string:
 *   /auth/callback?access_token=<jwt>&refresh_token=<rt>&expires_in=<secs>
 *
 * This page:
 * 1. Reads the tokens from URL search params
 * 2. Persists them in tokenStorage
 * 3. Redirects to the dashboard
 *
 * On failure (no token, or `error` param present) it redirects to /login.
 */
export function OAuthCallbackPage() {
  const intl = useAppIntl()
  const tokenStorage = useTokenStorage()
  const navigate = useNavigate()
  const handled = useRef(false)

  useEffect(() => {
    if (handled.current) return
    handled.current = true

    const params = new URLSearchParams(window.location.search)
    const accessToken = params.get('access_token')
    const refreshToken = params.get('refresh_token')
    const expiresIn = params.get('expires_in')
    const error = params.get('error')

    if (error || !accessToken) {
      navigate('/login', { replace: true })
      return
    }

    tokenStorage.setAccessToken(accessToken)

    if (refreshToken) {
      tokenStorage.setRefreshToken(refreshToken)
    }

    if (expiresIn) {
      const expiryTime = Date.now() + Number(expiresIn) * 1000
      tokenStorage.setTokenExpiry(expiryTime)
    }

    navigate('/', { replace: true })
  }, [tokenStorage, navigate])

  return (
    <div className="flex min-h-screen items-center justify-center">
      <p className="text-muted-foreground text-sm">
        {intl.formatMessage({
          id: 'auth.oauthCallback.signingIn',
          defaultMessage: 'Signing you in…',
        })}
      </p>
    </div>
  )
}
