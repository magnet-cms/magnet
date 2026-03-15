import { Prop, Schema, UI } from '@magnet-cms/common'

@Schema()
export class TestB03619E5 {
	@Prop({ required: true })
	@UI({ type: 'text' })
	title: string
}
