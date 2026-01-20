import { type NextRequest, NextResponse } from 'next/server'

export async function proxy(request: NextRequest) {
	const pathname = request.nextUrl.pathname

	// Handle root path - redirect to docs
	if (pathname === '/' || pathname === '') {
		return NextResponse.redirect(new URL('/docs', request.url))
	}

	return NextResponse.next()
}

export const config = {
	matcher: ['/'],
}
