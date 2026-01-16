import { BaseSchema } from '@magnet-cms/common'
import { MongoServerError } from 'mongodb'

export function mapQueryId<T>(query: Partial<BaseSchema<T>>): any {
	if (query.id) {
		const { id, ...rest } = query
		return { _id: id, ...rest }
	}
	return query
}

export function mapDocumentId<T>(doc: any): BaseSchema<T> {
	if (!doc) return {} as BaseSchema<T>
	const { _id, ...rest } = doc
	return { ...rest, id: _id.toString() }
}

export function isMongoServerError(
	error: unknown,
): error is MongoServerError & {
	keyPattern: Record<string, unknown>
	keyValue: Record<string, unknown>
} {
	return (
		typeof error === 'object' &&
		error !== null &&
		'code' in error &&
		(error as any).code === 11000 &&
		'keyPattern' in error &&
		typeof error.keyPattern === 'object' &&
		'keyValue' in error &&
		typeof error.keyValue === 'object'
	)
}
