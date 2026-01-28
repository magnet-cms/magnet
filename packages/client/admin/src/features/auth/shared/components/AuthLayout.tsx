import { Avatar, AvatarImage, AvatarFallback, Logo } from '@magnet-cms/ui/components/atoms'
import { Link } from 'react-router-dom'

interface AuthLayoutProps {
  children: React.ReactNode
  testimonial?: {
    quote: string
    author: string
    role: string
    avatar?: string
  }
  rightPanel?: React.ReactNode
  footerText?: string
  footerLinkText?: string
  footerLinkHref?: string
}

export function AuthLayout({
  children,
  testimonial,
  rightPanel,
  footerText = "Don't have an account?",
  footerLinkText = 'Sign up',
  footerLinkHref = '/signup',
}: AuthLayoutProps) {
  return (
    <div className="flex min-h-screen">
      {/* Left Panel - Form */}
      <div className="flex w-full flex-col justify-between border-r border-border bg-background p-10 lg:w-[480px]">
        {/* Logo */}
        <div>
          <Link to="/" className="inline-flex">
            <Logo />
          </Link>
        </div>

        {/* Form Content */}
        <div className="flex flex-1 items-center justify-center py-8">
          <div className="w-full max-w-sm">{children}</div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
          <span>{footerText}</span>
          <Link to={footerLinkHref} className="font-medium text-foreground hover:underline">
            {footerLinkText}
          </Link>
        </div>
      </div>

      {/* Right Panel - Hero/Testimonial */}
      <div className="relative hidden flex-1 items-center justify-center overflow-hidden bg-zinc-900 lg:flex">
        {/* Background Image with Overlay */}
        <div className="absolute inset-0">
          <img
            src="https://images.unsplash.com/photo-1469854523086-cc02fe5d8800?w=1920&q=80"
            alt="Travel background"
            className="size-full object-cover opacity-50 mix-blend-overlay"
          />
          <div className="absolute inset-0 bg-linear-to-t from-zinc-900 via-transparent to-zinc-900/50" />
        </div>

        {/* Gradient Blur Effect */}
        <div
          className="absolute left-1/2 top-1/2 size-[600px] -translate-x-1/2 -translate-y-1/2 rounded-full blur-[48px]"
          style={{
            backgroundImage:
              'linear-gradient(45deg, rgba(99, 102, 241, 0.3) 0%, rgba(168, 85, 247, 0.3) 50%, rgba(236, 72, 153, 0.3) 100%)',
          }}
        />

        {/* Preview Card */}
        {rightPanel && <div className="relative z-10">{rightPanel}</div>}

        {/* Testimonial */}
        {testimonial && (
          <div className="absolute bottom-10 left-10 right-10 z-10 flex flex-col gap-4">
            <p className="max-w-md text-sm font-medium leading-relaxed text-white/70">
              &ldquo;{testimonial.quote}&rdquo;
            </p>
            <div className="flex items-center gap-2">
              <Avatar className="size-6">
                {testimonial.avatar ? (
                  <AvatarImage src={testimonial.avatar} alt={testimonial.author} />
                ) : (
                  <AvatarFallback className="text-xs">
                    {testimonial.author.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <span className="text-xs text-white/50">
                {testimonial.author} • {testimonial.role}
              </span>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
