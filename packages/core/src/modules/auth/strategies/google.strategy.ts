/**
 * Normalised OAuth profile returned by every provider's validate() callback.
 *
 * OAuthService.registerStrategies() maps each provider's raw profile shape to
 * this interface so the rest of the system has a single, consistent type to
 * work with regardless of which provider was used.
 */
export interface OAuthProfile {
  /** Provider-specific unique user ID */
  id: string
  /** User email address (may be empty if the provider did not return one) */
  email: string
  /** Display name (best-effort from provider profile) */
  name: string
  /** Provider name, e.g. 'google', 'github', 'facebook', 'discord' */
  provider: string
}
