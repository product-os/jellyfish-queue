import * as assert from '@balena/jellyfish-assert';
import { Kernel } from 'autumndb';
import { getLogger, LogContext } from '@balena/jellyfish-logger';
import {
	ContractData,
	SessionContract,
} from '@balena/jellyfish-types/build/core';
import { strict as nativeAssert } from 'assert';
import * as graphileWorker from 'graphile-worker';
import { v4 as isUUID } from 'is-uuid';
import type { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { contracts } from './contracts';
import {
	QueueInvalidAction,
	QueueInvalidRequest,
	QueueInvalidSession,
	QueueNoRequest,
} from './errors';
import { getLastExecutionEvent, wait } from './events';
import type {
	ActionContract,
	ActionRequestContract,
	ExecuteContract,
} from './types';

const logger = getLogger(__filename);

const GRAPHILE_RETRIES = 10;
const GRAPHILE_RETRY_DELAY = 1000;

export interface ProducerOptionsSchedule {
	contract: string;
	runAt: Date;
}

export interface ProducerOptions {
	logContext: LogContext;
	action: string;
	card: string;
	type: string;
	arguments: ContractData;
	currentDate?: Date;
	originator?: string;
	schedule?: ProducerOptionsSchedule;
}

export interface ProducerResults {
	error: boolean;
	timestamp: string;
	data: ExecuteContract['data']['payload']['data'];
}

export interface QueueProducer {
	initialize: (logContext: LogContext) => Promise<void>;
	storeRequest: (
		actor: string,
		session: string,
		options: ProducerOptions,
	) => Promise<ActionRequestContract>;
	enqueue: (
		actor: string,
		session: string,
		options: ProducerOptions,
	) => Promise<ActionRequestContract>;
	waitResults: (
		logContext: LogContext,
		actionRequest: ActionRequestContract,
	) => Promise<ProducerResults>;
	getLastExecutionEvent: (
		logContext: LogContext,
		originator: string,
	) => Promise<ExecuteContract | null>;
	deleteJob: (context: LogContext, key: string) => Promise<void>;
}

async function props(obj: any) {
	const keys = Object.keys(obj);
	const values = Object.values(obj);
	return Promise.all(values).then((resolved) => {
		const result = {};
		for (let i = 0; i < keys.length; i += 1) {
			result[keys[i]] = resolved[i];
		}
		return result;
	});
}

/**
 * Queue module for Jellyfish.
 *
 * @module queue
 */

export class Producer implements QueueProducer {
	constructor(
		private kernel: Kernel,
		private pool: Pool,
		private session: string,
	) {}

	/**
	 * @summary Initialize the queue producer
	 * @function
	 * @public
	 *
	 * @param logContext - log context
	 */
	async initialize(logContext: LogContext): Promise<void> {
		logger.info(logContext, 'Inserting essential cards');
		await Promise.all(
			Object.values(contracts).map(async (card) => {
				return this.kernel.replaceContract(logContext, this.session, card);
			}),
		);

		// Set up the graphile worker to ensure that the graphile_worker schema
		// exists in the DB before we attempt to enqueue a job.
		const workerUtils = await this.makeWorkerUtils(logContext);
		workerUtils.release();
	}

	/**
	 * @summary Make and return Graphile worker utils instance
	 * @function
	 *
	 * @param logContext - log context
	 * @param retries - number of times to retry Graphile worker initialization
	 * @returns Graphile worker utils instance
	 *
	 * @example
	 * ```typescript
	 * const workerUtils = await this.makeWorkerUtils(context);
	 * ```
	 */
	async makeWorkerUtils(
		logContext: LogContext,
		retries: number = GRAPHILE_RETRIES,
	): Promise<graphileWorker.WorkerUtils> {
		try {
			const workerUtils = await graphileWorker.makeWorkerUtils({
				pgPool: this.pool,
			});
			return workerUtils;
		} catch (error) {
			if (retries > 0) {
				logger.info(logContext, 'Graphile worker failed to run', {
					retries,
					error,
				});
				await new Promise((resolve) => {
					setTimeout(resolve, GRAPHILE_RETRY_DELAY);
				});
				return this.makeWorkerUtils(logContext, retries - 1);
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

		logger.debug(options.logContext, 'Storing request', {
			actor,
			request: {
				slug,
				action: options.action,
				card: options.card,
			},
		});

		// Use the request session to retrieve the various cards, this ensures that
		// the action cannot be run if the session doesn't have access to the cards.
		const cards: any = await props({
			target: isUUID(options.card)
				? {
						id: options.card,

						// TODO: Require users to be explicit on the card version
				  }
				: this.kernel.getCardBySlug(
						options.logContext,
						session,
						`${options.card}@latest`,
				  ),

			action: this.kernel.getCardBySlug<ActionContract>(
				options.logContext,
				session,
				options.action,
			),
			session: this.kernel.getCardById<SessionContract>(
				options.logContext,
				session,
				session,
			),
		});

		assert.INTERNAL(
			options.logContext,
			cards.session,
			QueueInvalidSession,
			`No such session: ${session}`,
		);
		assert.USER(
			options.logContext,
			cards.action,
			QueueInvalidAction,
			`No such action: ${options.action}`,
		);
		assert.USER(
			options.logContext,
			cards.target,
			QueueInvalidRequest,
			`No such input card: ${options.card}`,
		);

		const date = options.currentDate || new Date();

		// Use the Queue's session instead of the session passed as a parameter as the
		// passed session shouldn't have permissions to create action requests
		return this.kernel.insertContract<ActionRequestContract>(
			options.logContext,
			this.session,
			{
				type: 'action-request@1.0.0',
				slug,
				data: {
					epoch: date.valueOf(),
					timestamp: date.toISOString(),
					context: options.logContext,
					originator: options.originator,
					actor: cards.session!.data.actor,
					action: `${cards.action!.slug}@${cards.action!.version}`,
					input: {
						id: cards.target!.id,
					},
					arguments: options.arguments,
					schedule: options.schedule?.contract,
					card: options.card,
					type: options.type,
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
	 * @param {LogContext} [options.logContext] - log context
	 * @returns {Promise<ActionRequestContract>} action request
	 */
	async enqueue(
		actor: string,
		session: string,
		options: ProducerOptions,
	): Promise<ActionRequestContract> {
		const request = await this.storeRequest(actor, session, options);

		let jobName = 'enqueue-action-request';
		const jobParameters: string[] = [`'actionRequest'`, '$1'];
		const values: any[] = [request];

		// Handle scheduled actions
		if (options.schedule) {
			jobName = `enqueue-action-request-${uuidv4()}`;
			jobParameters.push('run_at := $2', 'job_key := $3');
			values.push(options.schedule.runAt, options.schedule.contract);
		}

		logger.info(options.logContext, 'Enqueueing request', {
			actor,
			request: {
				slug: request.slug,
				action: options.action,
				card: options.card,
			},
		});

		await this.pool.query({
			name: jobName,
			text: `SELECT graphile_worker.add_job(${jobParameters.join(',')});`,
			values,
		});

		return request;
	}

	/**
	 * @summary Wait for an action request results
	 * @function
	 * @public
	 *
	 * @param {LogContext} logContext - log context
	 * @param {ActionRequestContract} actionRequest - action request
	 * @returns {Promise<ProducerResults>} results
	 */
	async waitResults(
		logContext: LogContext,
		actionRequest: ActionRequestContract,
	): Promise<ProducerResults> {
		logger.info(logContext, 'Waiting request results', {
			request: {
				id: actionRequest.id,
				slug: actionRequest.slug,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action,
			},
		});

		const request = await wait(logContext, this.kernel, this.session, {
			id: actionRequest.id,
			actor: actionRequest.data.actor,
		});

		logger.info(logContext, 'Got request results', {
			request: {
				id: actionRequest.id,
				slug: actionRequest.slug,
				card: actionRequest.data.input.id,
				type: actionRequest.data.input.type,
				actor: actionRequest.data.actor,
				action: actionRequest.data.action,
			},
		});

		nativeAssert(
			request,
			new QueueNoRequest(
				`Request not found: ${JSON.stringify(actionRequest, null, 2)}`,
			),
		);
		assert.INTERNAL(
			logContext,
			request.data.payload,
			QueueInvalidRequest,
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
	 * @param {LogContext} logContext - log context
	 * @param {String} originator - originator card id
	 * @returns {Promise<ExecuteContract | null>} last execution event
	 */
	async getLastExecutionEvent(
		logContext: LogContext,
		originator: string,
	): Promise<ExecuteContract | null> {
		return getLastExecutionEvent(
			logContext,
			this.kernel,
			this.session,
			originator,
		);
	}

	/**
	 * @summary Delete a job from the queue using its job key
	 * @param {Context} context - execution context
	 * @param {String} key - job key to delete
	 */
	async deleteJob(context: LogContext, key: string): Promise<void> {
		logger.debug(context, 'Deleting job from queue', {
			key,
		});

		await this.pool.query({
			text: `SELECT graphile_worker.remove_job($1);`,
			values: [key],
		});
	}
}
