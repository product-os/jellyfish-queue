import { testUtils as coreTestUtils } from 'autumndb';
import { v4 as uuidv4 } from 'uuid';
import { Consumer } from './consumer';
import { Producer } from './producer';
import type { ActionRequestContract } from './types';

/**
 * Context that can be used in tests against the queue.
 */
export interface TestContext extends coreTestUtils.TestContext {
	dequeue: (times?: number) => Promise<ActionRequestContract | null>;
	queue: {
		actor: string;
		consumer: Consumer;
		producer: Producer;
	};
}

const actionCreateCard = {
	slug: 'action-create-card',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Create a new card',
	data: {
		arguments: {},
	},
};

/**
 * Create a new `TestContext` with an initialized queue.
 */
export const newContext = async (
	options: coreTestUtils.NewContextOptions = {},
): Promise<TestContext> => {
	const coreTestContext = await coreTestUtils.newContext(options);

	/*const sessionContract = await coreTestContext.kernel.getCardById<SessionContract>(
		coreTestContext.logContext,
		coreTestContext.session,
		coreTestContext.session,
	);
	const queueUser = await coreTestContext.kernel.getCardById<UserContract>(
		coreTestContext.logContext,
		coreTestContext.session,
		sessionContract!.data.actor as string,
	);*/

	const consumedActionRequests: ActionRequestContract[] = [];
	const dequeue = async (
		times: number = 50,
	): Promise<ActionRequestContract | null> => {
		for (let i = 0; i < times; i++) {
			if (consumedActionRequests.length > 0) {
				return consumedActionRequests.shift()!;
			}

			await new Promise((resolve) => {
				setTimeout(resolve, 10);
			});
		}

		return null;
	};

	const consumer = new Consumer(
		coreTestContext.kernel,
		coreTestContext.pool,
		coreTestContext.session,
	);
	const producer = new Producer(
		coreTestContext.kernel,
		coreTestContext.pool,
		coreTestContext.session,
	);

	// Initialize the producer first to ensure necessary types exist
	await producer.initialize(coreTestContext.logContext);
	await Promise.all([
		await coreTestContext.kernel.insertContract(
			coreTestContext.logContext,
			coreTestContext.session,
			actionCreateCard,
		),
		consumer.initializeWithEventHandler(
			coreTestContext.logContext,
			async (payload: ActionRequestContract) => {
				consumedActionRequests.push(payload);
			},
		),
	]);

	return {
		dequeue,
		queue: {
			actor: uuidv4(),
			consumer,
			producer,
		},
		...coreTestContext,
	};
};

/**
 * Deinitialize the queue.
 */
export const destroyContext = async (context: TestContext) => {
	await context.queue.consumer.cancel();
	await coreTestUtils.destroyContext(context);
};
