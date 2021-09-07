/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import {
	ActionContract,
	ActionRequestContract,
	Contract,
	SessionContract,
} from '@balena/jellyfish-types/build/core';
import { queue } from '@balena/jellyfish-types';
import { errors } from '../../../lib';
import * as helpers from './helpers';

let context: helpers.IntegrationTestContext;

beforeAll(async () => {
	context = await helpers.before();
});

afterAll(async () => {
	await helpers.after(context);
});

describe('queue', () => {
	describe('.enqueue()', () => {
		test('should include the actor from the passed session', async () => {
			const typeCard = (await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			)) as Contract;
			const session = await context.kernel.getCardById<SessionContract>(
				context.context,
				context.session,
				context.session,
			);
			expect(session).not.toBe(null);
			await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				{
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					arguments: {
						properties: {
							version: '1.0.0',
							slug: 'foo',
							data: {
								foo: 'bar',
							},
						},
					},
				},
			);

			const request = await context.dequeue();
			expect(request).not.toBe(null);
			expect(session!.data.actor).toBe(request!.data.actor);
		});

		test('should include the whole passed action', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			const actionCard = await context.kernel.getCardBySlug<ActionContract>(
				context.context,
				context.session,
				'action-create-card@latest',
			);
			await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				{
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					arguments: {
						properties: {
							version: '1.0.0',
							slug: 'foo',
							data: {
								foo: 'bar',
							},
						},
					},
				},
			);

			const request = await context.dequeue();
			expect(request).not.toBe(null);
			expect(request!.data.action).toBe(
				`${actionCard!.slug}@${actionCard!.version}`,
			);
		});

		test('should set an originator', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				{
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					originator: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
					arguments: {
						properties: {
							slug: 'foo',
							version: '1.0.0',
						},
					},
				},
			);

			const request = await context.dequeue();
			expect(request).not.toBe(null);
			expect(request!.data.originator).toBe(
				'4a962ad9-20b5-4dd8-a707-bf819593cc84',
			);
		});

		test('should take a current date', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			const date = new Date();

			await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				{
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					currentDate: date,
					arguments: {
						properties: {
							slug: 'foo',
							version: '1.0.0',
						},
					},
				},
			);

			// Removing this as context.dequeue already retries!
			// const dequeue = async (times = 10) => {
			// 	const dequeued = await context.dequeue();
			// 	if (dequeued) {
			// 		return dequeued;
			// 	}

			// 	if (times <= 0) {
			// 		throw new Error("Didn't dequeue in time");
			// 	}

			// 	await Bluebird.delay(100);
			// 	return dequeue(times - 1);
			// };

			const request = await context.dequeue();
			expect(request).not.toBe(null);
			expect(request!.data.timestamp).toBe(date.toISOString());
		});

		test('should set a present timestamp', async () => {
			const currentDate = new Date();
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				{
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					arguments: {
						properties: {
							version: '1.0.0',
							slug: 'foo',
							data: {
								foo: 'bar',
							},
						},
					},
				},
			);

			const request = await context.dequeue();
			expect(request).not.toBe(null);
			expect(new Date(request!.data.timestamp) >= currentDate).toBe(true);
		});

		test('should throw if the type is a slug and was not found', async () => {
			expect(() => {
				return context.queue.producer.enqueue(
					context.queueActor,
					context.session,
					{
						action: 'action-create-card@1.0.0',
						context: context.context,
						card: 'foo-bar-baz-qux',
						type: 'type',
						arguments: {
							properties: {
								version: '1.0.0',
								slug: 'foo',
								data: {
									foo: 'bar',
								},
							},
						},
					},
				);
			}).rejects.toThrowError(errors.QueueInvalidRequest);
		});

		test('should throw if the action was not found', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			expect(() => {
				return context.queue.producer.enqueue(
					context.queueActor,
					context.session,
					{
						action: 'action-foo-bar@1.0.0',
						context: context.context,
						card: typeCard!.id,
						type: typeCard!.type,
						arguments: {
							properties: {
								version: '1.0.0',
								slug: 'foo',
								data: {
									foo: 'bar',
								},
							},
						},
					},
				);
			}).rejects.toThrowError(errors.QueueInvalidAction);
		});

		test('should throw if the session was not found', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			const id = 'aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa';
			expect(() => {
				return context.queue.producer.enqueue(context.queueActor, id, {
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					arguments: {
						properties: {
							version: '1.0.0',
							slug: 'foo',
							data: {
								foo: 'bar',
							},
						},
					},
				});
			}).rejects.toThrowError(context.kernel.errors.JellyfishInvalidSession);
		});
	});

	describe('.dequeue()', () => {
		test('should return nothing if no requests', async () => {
			const request = await context.dequeue();
			expect(request).toBe(null);
		});

		test('should not let the same owner take a request twice', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			const actionRequest = await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				{
					action: 'action-create-card@1.0.0',
					context: context.context,
					card: typeCard!.id,
					type: typeCard!.type,
					arguments: {
						properties: {
							version: '1.0.0',
							slug: 'foo',
							data: {
								foo: 'bar',
							},
						},
					},
				},
			);

			const request1 = await context.dequeue();
			expect(request1).not.toBe(null);
			expect(request1!.slug).toBe(actionRequest.slug);

			const request2 = await context.dequeue();

			expect(request2).toBe(null);
		});

		test('should cope with link materialization failures', async () => {
			const typeCard = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				'card@latest',
			);
			expect(typeCard).not.toBe(null);

			const producerOptions: queue.ProducerOptions = {
				action: 'action-create-card@1.0.0',
				context: context.context,
				card: typeCard!.id,
				type: typeCard!.type,
				arguments: {
					properties: {
						slug: 'foo',
						version: '1.0.0',
					},
				},
			};

			const enqueued = await context.queue.producer.enqueue(
				context.queueActor,
				context.session,
				producerOptions,
			);

			const actionRequest = context.kernel.defaults<ActionRequestContract>({
				id: enqueued.id,
				slug: enqueued.slug,
				type: enqueued.type,
				data: enqueued.data,
			});

			await context.queue.consumer.postResults(
				context.queueActor,
				context.context,
				actionRequest,
				{
					error: false,
					data: {
						foo: 'true',
					},
				},
			);

			// Simulate non-materialized links
			await context.backend.upsertElement(
				context.context,
				Object.assign({}, enqueued, {
					links: {},
				}),
			);

			const currentRequest = await context.kernel.getCardBySlug(
				context.context,
				context.session,
				`${enqueued.slug}@${enqueued.version}`,
			);
			expect(currentRequest).not.toBe(null);

			expect(currentRequest!.links).toEqual({});
		});
	});
});
