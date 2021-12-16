import * as _ from 'lodash';
import * as events from './events';
import * as graphileWorker from 'graphile-worker';
import { Logger } from '@graphile/logger';
import { getLogger } from '@balena/jellyfish-logger';
import { contracts } from './contracts';
import { defaultEnvironment } from '@balena/jellyfish-environment';
import * as metrics from '@balena/jellyfish-metrics';
import {
	ActionRequestContract,
	Context,
	JellyfishKernel,
	LinkContract,
} from '@balena/jellyfish-types/build/core';
import { core } from '@balena/jellyfish-types';
import {
	PostResults,
	OnMessageEventHandler,
	QueueConsumer,
	ExecuteContract,
} from '@balena/jellyfish-types/build/queue';

const logger = getLogger(__filename);

const LINK_EXECUTE = {
	NAME: 'executes',
	INVERSE_NAME: 'is executed by',
};

const EXECUTE_LINK_VERSION = '1.0.0';

const RUN_RETRIES = 10;
const RUN_RETRY_DELAY = 1000;

const getExecuteLinkSlug = (actionRequest: ActionRequestContract): string => {
	return `link-execute-${actionRequest.slug}`;
};

const linkExecuteEvent = async (
	jellyfish: JellyfishKernel,
	context: Context,
	session: string,
	eventCard: ExecuteContract,
	actionRequest: ActionRequestContract,
): Promise<LinkContract> => {
	return jellyfish.insertCard<LinkContract>(context, session, {
		slug: getExecuteLinkSlug(actionRequest),
		type: 'link@1.0.0',
		version: EXECUTE_LINK_VERSION,
		name: LINK_EXECUTE.NAME,
		data: {
			inverseName: LINK_EXECUTE.INVERSE_NAME,
			from: {
				id: eventCard.id,
				type: eventCard.type,
			},
			to: {
				id: actionRequest.id,
				type: actionRequest.type,
			},
		},
	});
};

export class Consumer implements QueueConsumer {
	messagesBeingHandled: number = 0;
	graphileRunner: graphileWorker.Runner | null = null;

	constructor(private jellyfish: JellyfishKernel, private session: string) {}

	async initializeWithEventHandler(
		context: Context,
		onMessageEventHandler: OnMessageEventHandler,
	): Promise<void> {
		logger.info(context, 'Inserting essential cards');
		await Promise.all(
			Object.values(contracts).map(async (card) => {
				return this.jellyfish.replaceCard(context, this.session, card);
			}),
		);

		await this.run(context, onMessageEventHandler);
		this.graphileRunner!.stop = _.once(this.graphileRunner!.stop);
	}

	async run(
		context: Context,
		onMessageEventHandler: OnMessageEventHandler,
		retries: number = RUN_RETRIES,
	): Promise<boolean> {
		try {
			this.graphileRunner = await graphileWorker.run({
				noHandleSignals: true,
				pgPool: this.jellyfish.backend.connection.$pool,
				concurrency: defaultEnvironment.queue.concurrency,
				pollInterval: 1000,
				logger: new Logger((_scope) => {
					return _.noop;
				}),
				taskList: {
					actionRequest: async (result) => {
						// TS-TODO: Update graphile types to support Task list type parmaeterisation so we don't need to cast
						const payload = result as core.ActionRequestContract;
						const action = payload.data.action.split('@')[0];
						try {
							this.messagesBeingHandled++;
							metrics.markJobAdd(action, context.id);
							await onMessageEventHandler(payload);
						} finally {
							this.messagesBeingHandled--;
							metrics.markJobDone(action, context.id, payload.data.timestamp);
						}
					},
				},
			});
		} catch (error) {
			if (retries > 0) {
				logger.info(context, 'Graphile worker failed to run', {
					retries,
					error,
				});
				await new Promise((resolve) => {
					setTimeout(resolve, RUN_RETRY_DELAY);
				});
				return this.run(context, onMessageEventHandler, retries - 1);
			}
			throw error;
		}

		return true;
	}

	async cancel(): Promise<void> {
		if (this.graphileRunner) {
			await this.graphileRunner.stop();
		}
		while (this.messagesBeingHandled > 0) {
			await new Promise((resolve) => {
				setTimeout(resolve, 10);
			});
		}
	}

	/**
	 * @summary Post execution results
	 * @function
	 * @public
	 *
	 * @param {String} actor - actor. TS-TODO - this parameter is currently unused.
	 * @param {Context} context - execution context
	 * @param {ActionRequestContract} actionRequest - action request
	 * @param {PostResults} results - action results
	 * @param {Boolean} results.error - whether the result is an error
	 * @param {Any} results.data - action result
	 * @returns {ExecuteContract} execute event card
	 */
	async postResults(
		_actor: string,
		context: Context,
		actionRequest: ActionRequestContract,
		results: PostResults,
	): Promise<ExecuteContract> {
		const eventCard = await events.post(
			context,
			this.jellyfish,
			this.session,
			{
				action: actionRequest.data.action,
				actor: actionRequest.data.actor,
				id: actionRequest.id,
				card: actionRequest.data.input.id,
				timestamp: actionRequest.data.timestamp,
				originator: actionRequest.data.originator,
			},
			results,
		);

		await linkExecuteEvent(
			this.jellyfish,
			context,
			this.session,
			eventCard,
			actionRequest,
		);

		return eventCard;
	}
}
