import { BaseSchema, hasProperty, isObject } from '@magnet-cms/common'
import { MongoServerError } from 'mongodb'
import type { Types } from 'mongoose'

/**
 * Document with MongoDB _id field
 */
interface MongoDocument {
	_id: Types.ObjectId | string
	[key: string]: unknown
}

/**
 * Filter query type for MongoDB operations
 */
export type MongoFilterQuery<T> = {
	_id?: string | Types.ObjectId
} & Omit<Partial<T>, 'id'>

/**
 * Map a query with 'id' field to MongoDB '_id' field
 */
export function mapQueryId<T>(
	query: Partial<BaseSchema<T>>,
): MongoFilterQuery<T> {
	if ('id' in query && query.id !== undefined) {
		const { id, ...rest } = query
		return { _id: id, ...rest } as MongoFilterQuery<T>
	}
	return query as MongoFilterQuery<T>
}

/**
 * Check if value has MongoDB _id field
 */
function hasMongoId(doc: unknown): doc is MongoDocument {
	return isObject(doc) && hasProperty(doc, '_id') && doc._id !== undefined
}

/**
 * Map a MongoDB document to a BaseSchema document (convert _id to id)
 */
export function mapDocumentId<T>(doc: unknown): BaseSchema<T> {
	if (!doc || !isObject(doc)) return {} as BaseSchema<T>

	if (hasMongoId(doc)) {
		const { _id, ...rest } = doc
		const id = typeof _id === 'string' ? _id : _id.toString()
		return { ...rest, id } as BaseSchema<T>
	}

	return doc as BaseSchema<T>
}

/**
 * Type guard for MongoDB server errors with duplicate key info
 */
export function isMongoServerError(
	error: unknown,
): error is MongoServerError & {
	keyPattern: Record<string, unknown>
	keyValue: Record<string, unknown>
} {
	return (
		isObject(error) &&
		hasProperty(error, 'code') &&
		error.code === 11000 &&
		hasProperty(error, 'keyPattern') &&
		isObject(error.keyPattern) &&
		hasProperty(error, 'keyValue') &&
		isObject(error.keyValue)
	)
}
