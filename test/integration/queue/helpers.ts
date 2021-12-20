import { v4 as uuidv4 } from 'uuid';
import * as helpers from '../backend-helpers';
import * as queue from '../../../lib';
import { QueueConsumer } from '../../../lib/consumer';
import { QueueProducer } from '../../../lib/producer';
import {
	ActionRequestContract,
	SessionContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';

const Consumer = queue.Consumer;
const Producer = queue.Producer;

export interface IntegrationCoreTestContext {
	session: string;
	actor: UserContract;
	queueActor: string;
	dequeue: (times?: number) => Promise<ActionRequestContract | null>;
	queue: {
		consumer: QueueConsumer;
		producer: QueueProducer;
	};
}

export interface IntegrationTestContext
	extends helpers.BackendTestContext,
		IntegrationCoreTestContext {}

const actionCreateCard = {
	slug: 'action-create-card',
	type: 'action@1.0.0',
	version: '1.0.0',
	name: 'Create a new card',
	data: {
		arguments: {},
	},
};

export const before = async (): Promise<IntegrationTestContext> => {
	const context = (await helpers.before()) as helpers.BackendTestContext &
		Partial<IntegrationCoreTestContext>;
	context.session = context.kernel.sessions!.admin;

	const session = await context.kernel.getCardById<SessionContract>(
		context.logContext,
		context.session,
		context.session,
	);

	context.actor = (await context.kernel.getCardById<UserContract>(
		context.logContext,
		context.session,
		session!.data.actor as string,
	)) as UserContract;

	await context.kernel.insertCard(
		context.logContext,
		context.session,
		actionCreateCard,
	);

	context.queue = {
		consumer: new Consumer(context.kernel, context.session),
		producer: new Producer(context.kernel, context.session),
	};

	const consumedActionRequests: ActionRequestContract[] = [];

	await context.queue.consumer.initializeWithEventHandler(
		context.logContext,
		async (payload: ActionRequestContract) => {
			consumedActionRequests.push(payload);
		},
	);

	context.queueActor = uuidv4();

	const dequeue = async (
		times: number = 50,
	): Promise<ActionRequestContract | null> => {
		if (consumedActionRequests.length === 0) {
			if (times <= 0) {
				return null;
			}

			await new Promise((resolve) => {
				setTimeout(resolve, 10);
			});
			return dequeue(times - 1);
		}

		return consumedActionRequests.shift() as ActionRequestContract;
	};

	context.dequeue = dequeue;

	await context.queue.producer.initialize(context.logContext);

	return context as IntegrationTestContext;
};

export const after = async (context: IntegrationTestContext): Promise<void> => {
	if (context.queue) {
		await context.queue.consumer.cancel();
	}

	if (context.kernel) {
		await helpers.after(context);
	}
};
