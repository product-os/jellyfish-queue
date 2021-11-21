import type {
	ExecuteContract,
	ProducerOptions,
	ProducerResults,
	QueueProducer,
} from '@balena/jellyfish-types/build/queue';
import {
	ActionContract,
	ActionRequestContract,
	Context,
	JellyfishKernel,
	SessionContract,
} from '@balena/jellyfish-types/build/core';
import Bluebird from 'bluebird';
import { v4 as isUUID } from 'is-uuid';
import { v4 as uuidv4 } from 'uuid';
import * as graphileWorker from 'graphile-worker';
import { getLogger } from '@balena/jellyfish-logger';
import * as assert from '@balena/jellyfish-assert';
import * as errors from './errors';
import * as events from './events';
import { contracts } from './contracts';

const logger = getLogger(__filename);

const GRAPHILE_RETRIES = 10;
const GRAPHILE_RETRY_DELAY = 1000;

/**
 * Queue module for Jellyfish.
 *
 * @module queue
 */

export class Producer implements QueueProducer {
	constructor(private jellyfish: JellyfishKernel, private session: string) {}

	/**
	 * @summary Initialize the queue producer
	 * @function
	 * @public
	 *
	 * @param context - execution context
	 */
	async initialize(context: Context): Promise<void> {
		logger.info(context, 'Inserting essential cards');
		await Bluebird.map(Object.values(contracts), async (card) => {
			return this.jellyfish.replaceCard(context, this.session, card);
		});

		// Set up the graphile worker to ensure that the graphile_worker schema
		// exists in the DB before we attempt to enqueue a job.
		const workerUtils = await this.makeWorkerUtils(context);
		workerUtils.release();
	}

	/**
	 * @summary Make and return Graphile worker utils instance
	 * @function
	 *
	 * @param context - execution context
	 * @param retries - number of times to retry Graphile worker initialization
	 * @returns Graphile worker utils instance
	 *
	 * @example
	 * ```typescript
	 * const workerUtils = await this.makeWorkerUtils(context);
	 * ```
	 */
	async makeWorkerUtils(
		context: Context,
		retries: number = GRAPHILE_RETRIES,
	): Promise<graphileWorker.WorkerUtils> {
		try {
			const workerUtils = await graphileWorker.makeWorkerUtils({
				pgPool: this.jellyfish.backend.connection.$pool,
			});
			return workerUtils;
		} catch (error) {
			if (retries > 0) {
				logger.info(context, 'Graphile worker failed to run', {
					retries,
					error,
				});
				await Bluebird.delay(GRAPHILE_RETRY_DELAY);
				return this.makeWorkerUtils(context, retries - 1);
			}
			throw error;
		}
	}

	// FIXME this function exists solely for the purpose of allowing upstream code
	// to put stuff "in the queue" ( = the request table on db) and call worker.execute
	// right after. Fix upstream code by calling queue.enqueue and let the worker deal
	// with the request asynchronously. Once done, turn this function private or merge
	// it with `enqueue`
	async storeRequest(
		actor: string,
		session: string,
		options: ProducerOptions,
	): Promise<ActionRequestContract> {
		const id = uuidv4();
		const slug = `action-request-${id}`;

		logger.debug(options.context, 'Storing request', {
			actor,
			request: {
				slug,
				action: options.action,
				card: options.card,
			},
		});

		// Use the request session to retrieve the various cards, this ensures that
		// the action cannot be run if the session doesn't have access to the cards.
		const cards = await Bluebird.props({
			target: isUUID(options.card)
				? {
						id: options.card,

						// TODO: Require users to be explicit on the card version
				  }
				: this.jellyfish.getCardBySlug(
						options.context,
						session,
						`${options.card}@latest`,
				  ),

			action: this.jellyfish.getCardBySlug<ActionContract>(
				options.context,
				session,
				options.action,
			),
			session: this.jellyfish.getCardById<SessionContract>(
				options.context,
				session,
				session,
			),
		});

		assert.INTERNAL(
			options.context,
			cards.session,
			errors.QueueInvalidSession,
			`No such session: ${session}`,
		);
		assert.USER(
			options.context,
			cards.action,
			errors.QueueInvalidAction,
			`No such action: ${options.action}`,
		);
		assert.USER(
			options.context,
			cards.target,
			errors.QueueInvalidRequest,
			`No such input card: ${options.card}`,
		);

		const date = options.currentDate || new Date();

		// Use the Queue's session instead of the session passed as a parameter as the
		// passed session shouldn't have permissions to create action requests
		return this.jellyfish.insertCard<ActionRequestContract>(
			options.context,
			this.session,
			{
				type: 'action-request@1.0.0',
				slug,
				data: {
					epoch: date.valueOf(),
					timestamp: date.toISOString(),
					context: options.context,
					originator: options.originator,
					actor: cards.session!.data.actor,
					action: `${cards.action!.slug}@${cards.action!.version}`,
					input: {
						id: cards.target!.id,
					},
					arguments: options.arguments,
				},
			},
		);
	}

	/**
	 * @summary Enqueue a request
	 * @function
	 * @public
	 *
	 * @param {String} actor - actor
	 * @param {String} session - session
	 * @param {ProducerOptions} options - options
	 * @param {String} options.action - action slug
	 * @param {String} options.card - action input card id
	 * @param {Object} options.arguments - action arguments
	 * @param {Date} [options.currentDate] - current date
	 * @param {String} [options.originator] - card id that originated this action
	 * @param {Context} [options.context] - execution context
	 * @returns {Promise<ActionRequestContract>} action request
	 */
	async enqueue(
		actor: string,
		session: string,
		options: ProducerOptions,
	): Promise<ActionRequestContract> {
		const request = await this.storeRequest(actor, session, options);

		logger.info(options.context, 'Enqueueing request', {
			actor,
			request: {
				slug: request.slug,
				action: options.action,
				card: options.card,
			},
		});

		await this.jellyfish.backend.connection.any({
			name: 'enqueue-action-request',
			text: "SELECT graphile_worker.add_job('actionRequest', $1);",
			values: [request],
		});

		return request;
	}

	/**
	 * @summary Wait for an action request results
	 * @function
	 * @public
	 *
	 * @param {Context} context - execution context
	 * @param {ActionRequestContract} actionRequest - action request
	 * @returns {Promise<ProducerResults>} results
	 */
	async waitResults(
		context: Context,
		actionRequest: ActionRequestContract,
	): Promise<ProducerResults> {
		logger.info(context, 'Waiting request results', {
			request: {
				id: actionRequest.id,
				slug: actionRequest.slug,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action,
			},
		});

		const request = await events.wait(context, this.jellyfish, this.session, {
			id: actionRequest.id,
			actor: actionRequest.data.actor,
		});

		logger.info(context, 'Got request results', {
			request: {
				id: actionRequest.id,
				slug: actionRequest.slug,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action,
			},
		});

		assert.INTERNAL(context, request, errors.QueueNoRequest, () => {
			return `Request not found: ${JSON.stringify(actionRequest, null, 2)}`;
		});
		assert.INTERNAL(
			context,
			request.data.payload,
			errors.QueueInvalidRequest,
			() => {
				return `Execute event has no payload: ${JSON.stringify(
					request,
					null,
					2,
				)}`;
			},
		);

		return {
			error: request.data.payload.error,
			timestamp: request.data.payload.timestamp,
			data: request.data.payload.data,
		};
	}

	/**
	 * @summary Get the last execution event given an originator
	 * @function
	 * @public
	 *
	 * @param {Context} context - execution context
	 * @param {String} originator - originator card id
	 * @returns {Promise<ExecuteContract | null>} last execution event
	 */
	async getLastExecutionEvent(
		context: Context,
		originator: string,
	): Promise<ExecuteContract | null> {
		return events.getLastExecutionEvent(
			context,
			this.jellyfish,
			this.session,
			originator,
		);
	}
}
