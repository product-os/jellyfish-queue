/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import Bluebird from 'bluebird';
import { v4 as uuidv4 } from 'uuid';
import * as helpers from '../backend-helpers';
import * as queue from '../../../lib';
import {
	SessionContract,
	UserContract,
} from '@balena/jellyfish-types/build/core';
import {
	ActionPayload,
	QueueConsumer,
	QueueProducer,
} from '@balena/jellyfish-types/build/queue';

const Consumer = queue.Consumer;
const Producer = queue.Producer;

export interface IntegrationCoreTestContext {
	session: string;
	actor: UserContract;
	queueActor: string;
	dequeue: (times?: number) => Promise<ActionPayload | null>;
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

export const before = async (
	contextInput: Partial<IntegrationTestContext> = {},
	options?: helpers.BackendTestOptions,
): Promise<IntegrationTestContext> => {
	const context = (await helpers.before(
		contextInput,
		options && {
			suffix: options.suffix,
		},
	)) as helpers.BackendTestContext & Partial<IntegrationCoreTestContext>;
	context.session = context.kernel.sessions.admin;

	const session = await context.kernel.getCardById<SessionContract>(
		context.context,
		context.session,
		context.session,
	);

	context.actor = (await context.kernel.getCardById<UserContract>(
		context.context,
		context.session,
		session!.data.actor as string,
	)) as UserContract;

	await context.kernel.insertCard(
		context.context,
		context.session,
		actionCreateCard,
	);

	context.queue = {
		consumer: new Consumer(context.kernel, context.session),
		producer: new Producer(context.kernel, context.session),
	};

	const consumedActionRequests: ActionPayload[] = [];

	await context.queue.consumer.initializeWithEventHandler(
		context.context,
		async (payload: ActionPayload) => {
			consumedActionRequests.push(payload);
		},
	);

	context.queueActor = uuidv4();

	const dequeue = async (times: number = 50): Promise<ActionPayload | null> => {
		if (consumedActionRequests.length === 0) {
			if (times <= 0) {
				return null;
			}

			await Bluebird.delay(10);
			return dequeue(times - 1);
		}

		return consumedActionRequests.shift() as ActionPayload;
	};

	context.dequeue = dequeue;

	await context.queue.producer.initialize(context.context);

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
