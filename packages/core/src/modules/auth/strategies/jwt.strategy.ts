import { MagnetModuleOptions } from '@magnet-cms/common'
import { Inject, Injectable } from '@nestjs/common'
import { PassportStrategy } from '@nestjs/passport'
import { ExtractJwt, Strategy } from 'passport-jwt'

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
	constructor(
		@Inject(MagnetModuleOptions) private readonly options: MagnetModuleOptions,
	) {
		super({
			jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
			ignoreExpiration: false,
			secretOrKey: options.jwt.secret,
		})
	}

	async validate(payload: { sub: string; email: string; role: string }) {
		return { id: payload.sub, email: payload.email, role: payload.role }
	}
}
