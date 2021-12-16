import { getLogger } from '@balena/jellyfish-logger';
import { JellyfishKernel, Context } from '@balena/jellyfish-types/build/core';
import type { JSONSchema } from '@balena/jellyfish-types';
import type {
	ExecuteContract,
	ExecuteContractDefinition,
	PostResults,
	PostOptions,
} from '@balena/jellyfish-types/build/queue';

const logger = getLogger(__filename);

/**
 * @summary The execution event card type slug
 * @type {String}
 * @private
 */
const EXECUTION_EVENT_TYPE: string = 'execute';

/**
 * @summary The execution event card version
 * @type {String}
 * @private
 * @description
 * Events in the system are meant to be immutable, so
 * they would always stay at a fixed version.
 */
const EXECUTION_EVENT_VERSION: string = '1.0.0';

/**
 * @summary Get the slug of an execute event card
 * @function
 * @public
 *
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @returns {String} slug
 */
export const getExecuteEventSlug = (options: { id: string }): string => {
	return `${EXECUTION_EVENT_TYPE}-${options.id}`;
};

/**
 * @summary Create request execution event
 * @function
 * @public
 *
 * @param {Context} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @param {String} options.actor - actor id
 * @param {String} options.action - action id
 * @param {String} options.timestamp - action timestamp
 * @param {String} options.card - action input card id
 * @param {String} [options.originator] - action originator card id
 * @param {Object} results - action results
 * @param {Boolean} results.error - whether the result is an error
 * @param {Any} results.data - action result
 * @returns {Object} event card
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const card = await events.post({ ... }, jellyfish, session, {
 *   id: '414f2345-4f5e-4571-820f-28a49731733d',
 *   action: '57692206-8da2-46e1-91c9-159b2c6928ef',
 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422',
 *   actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
 *   originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
 *   timestamp: '2018-06-30T19:34:42.829Z'
 * }, {
 *   error: false,
 *   data: '414f2345-4f5e-4571-820f-28a49731733d'
 * })
 *
 * console.log(card.id)
 */
export const post = async (
	context: Context,
	jellyfish: JellyfishKernel,
	session: string,
	options: PostOptions,
	results: PostResults,
): Promise<ExecuteContract> => {
	const date = new Date();
	const data = {
		timestamp: date.toISOString(),
		target: options.id,
		actor: options.actor,
		payload: {
			action: options.action,
			card: options.card,
			timestamp: options.timestamp,
			error: results.error,
			data: results.data,
		},
	};

	const contents: ExecuteContractDefinition = {
		type: `${EXECUTION_EVENT_TYPE}@${EXECUTION_EVENT_VERSION}`,
		slug: getExecuteEventSlug({
			id: options.id,
		}),
		version: EXECUTION_EVENT_VERSION,
		active: true,
		markers: [],
		tags: [],
		requires: [],
		capabilities: [],
		data,
	};

	if (options.originator) {
		contents.data.originator = options.originator;
	}

	return jellyfish.insertCard<ExecuteContract>(context, session, contents);
};

/**
 * @summary Get the last execution event given an originator
 * @function
 * @public
 *
 * @param {Context} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {String} originator - originator card id
 * @returns {(Object|Null)} last execution event
 *
 * @example
 * const originator = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 *
 * const executeEvent = await events.getLastExecutionEvent({ ... }, jellyfish, session, originator)
 * if (executeEvent) {
 *   console.log(executeEvent.data.timestamp)
 * }
 */
export const getLastExecutionEvent = async (
	context: Context,
	jellyfish: JellyfishKernel,
	session: string,
	originator: string,
): Promise<any> => {
	const events = await jellyfish.query(
		context,
		session,
		{
			type: 'object',
			required: ['active', 'type', 'data'],
			additionalProperties: true,
			properties: {
				active: {
					type: 'boolean',
					const: true,
				},
				type: {
					type: 'string',
					const: `${EXECUTION_EVENT_TYPE}@${EXECUTION_EVENT_VERSION}`,
				},
				data: {
					type: 'object',
					required: ['originator'],
					additionalProperties: true,
					properties: {
						originator: {
							type: 'string',
							const: originator,
						},
					},
				},
			},
		},
		{
			sortBy: 'created_at',
			limit: 1,
		},
	);

	return events[0] || null;
};

export interface WaitOptions {
	id: string;
	actor: string;
	action?: string;
	card?: string;
}

/**
 * @summary Wait for an execution request event
 * @function
 * @public
 *
 * @param {Context} context - execution context
 * @param {Object} jellyfish - jellyfish instance
 * @param {String} session - session id
 * @param {Object} options - options
 * @param {String} options.id - request id
 * @param {String} options.actor - actor id
 * @returns {Object} execution request event
 *
 * @example
 * const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
 * const card = await events.wait({ ... }, jellyfish, session, {
 *   id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
 *   card: '033d9184-70b2-4ec9-bc39-9a249b186422'
 * })
 *
 * console.log(card.id)
 */
export const wait = async (
	context: Context,
	jellyfish: JellyfishKernel,
	session: string,
	options: WaitOptions,
): Promise<ExecuteContract | undefined> => {
	const slug = `${EXECUTION_EVENT_TYPE}-${options.id}`;
	const schema: JSONSchema = {
		type: 'object',
		additionalProperties: true,
		required: ['slug', 'active', 'type', 'data'],
		properties: {
			slug: {
				type: 'string',
				const: slug,
			},
			active: {
				type: 'boolean',
				const: true,
			},
			type: {
				type: 'string',
				const: `${EXECUTION_EVENT_TYPE}@${EXECUTION_EVENT_VERSION}`,
			},
			data: {
				type: 'object',
				additionalProperties: true,
				required: ['payload'],
				properties: {
					payload: {
						type: 'object',
						additionalProperties: true,
					},
				},
			},
		},
	};

	let result: ExecuteContract | null = null;

	const stream = await jellyfish.stream(context, session, schema);
	logger.info(context, 'Wait stream opened', {
		slug,
	});

	stream.once('data', (change) => {
		result = change.after;

		logger.info(context, 'Found results using stream', {
			slug: result?.slug,
			data: Object.keys(result?.data || {}),
		});

		stream.close();
	});

	return new Promise((resolve, reject) => {
		stream.once('error', (error) => {
			stream.removeAllListeners();
			logger.exception(context, 'Wait stream error', error);
			reject(error);
		});

		stream.once('closed', () => {
			stream.removeAllListeners();
			logger.info(context, 'Closing wait stream', {
				slug,
			});

			resolve(result || undefined);
		});

		// Don't perform a "get by slug" if we already have a match.
		if (result) {
			return;
		}

		jellyfish
			.getCardBySlug(context, session, `${slug}@${EXECUTION_EVENT_VERSION}`)
			.then((card) => {
				if (!card) {
					return;
				}

				logger.info(context, 'Found results on first slug query', {
					slug: card.slug,
					data: Object.keys(card.data),
				});

				result = result || (card as ExecuteContract);
				stream.close();
			})
			.catch((error) => {
				stream.removeAllListeners();
				reject(error);
			});
	});
};
