/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

import { omit } from 'lodash';
import * as Bluebird from 'bluebird';
import * as helpers from './helpers';
import { events } from '../../../lib';

let context: helpers.IntegrationTestContext;

beforeAll(async () => {
	context = await helpers.before();
});

afterAll(async () => {
	await helpers.after(context);
});

describe('events', () => {
	describe('.post()', () => {
		test('should insert an active execute card', async () => {
			const id = context.generateRandomID();
			const event = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id,
					},
				},
			);

			const card = await context.kernel.getCardById(
				context.context,
				context.session,
				event.id,
			);
			expect(card!.active).toBe(true);
			expect(card!.type).toBe('execute@1.0.0');
		});

		test('should set a present timestamp', async () => {
			const currentDate = new Date();
			const id = context.generateRandomID();

			const card = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id,
					},
				},
			);

			expect(new Date(card.data.timestamp) >= currentDate).toBe(true);
		});

		test('should not use a passed id', async () => {
			const id = context.generateRandomID();
			const card = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id: '414f2345-4f5e-4571-820f-28a49731733d',
					},
				},
			);

			expect(card.id).not.toBe(id);
		});

		test("should fail if the result doesn't contain an `error` field", async () => {
			const id = context.generateRandomID();
			await expect(() => {
				return events.post(
					context.context,
					context.kernel,
					context.session,
					{
						id,
						action: 'action-create-card@1.0.0',
						card: '033d9184-70b2-4ec9-bc39-9a249b186422',
						actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
						timestamp: '2018-06-30T19:34:42.829Z',
					},
					{
						data: {
							id,
						},
					} as any,
				);
			}).rejects.toThrowError(context.kernel.errors.JellyfishSchemaMismatch);
		});

		test('should use the passed timestamp in the payload', async () => {
			const id = context.generateRandomID();
			const card = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id,
					},
				},
			);

			expect(card.data.payload.timestamp).toBe('2018-06-30T19:34:42.829Z');
			expect(card.data.payload.timestamp).not.toBe(card.data.timestamp);
		});

		test('should allow an object result', async () => {
			const card = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id: context.generateRandomID(),
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						value: 5,
					},
				},
			);

			expect(card.data.payload.data).toEqual({
				value: 5,
			});
		});
	});

	describe('.wait()', () => {
		test('should return when a certain execute event is inserted', (done) => {
			const id = context.generateRandomID();
			events
				.wait(context.context, context.kernel, context.session, {
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
				})
				.then(async () => {
					// Wait a bit for `postgres.upsertObject` to terminate
					// Otherwise, we close the underlying connections while the rest
					// of the code of upsertObject is still running, causing errors
					// unrelated to the test
					await Bluebird.delay(500);
					done();
				})
				.catch(done);

			Bluebird.delay(500)
				.then(() => {
					return events.post(
						context.context,
						context.kernel,
						context.session,
						{
							id,
							action: '57692206-8da2-46e1-91c9-159b2c6928ef',
							card: '033d9184-70b2-4ec9-bc39-9a249b186422',
							actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
							timestamp: '2018-06-30T19:34:42.829Z',
						},
						{
							error: false,
							data: {
								id,
							},
						},
					);
				})
				.catch(done);
		});

		test('should return if the card already exists', async () => {
			const id = context.generateRandomID();
			await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id,
					},
				},
			);

			const card = await events.wait(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
				},
			);

			expect(card.type).toBe('execute@1.0.0');
			expect(card.data.target).toBe(id);
			expect(card.data.actor).toBe('57692206-8da2-46e1-91c9-159b2c6928ef');
			expect(card.data.payload.card).toBe(
				'033d9184-70b2-4ec9-bc39-9a249b186422',
			);
		});

		test('should be able to access the event payload of a huge event', async (done) => {
			expect.assertions(2);
			const BIG_EXECUTE_CARD = require('./big-execute.json');

			events
				.wait(context.context, context.kernel, context.session, {
					id: BIG_EXECUTE_CARD.slug.replace(/^execute-/g, ''),
					action: BIG_EXECUTE_CARD.data.action,
					card: BIG_EXECUTE_CARD.data.target,
					actor: BIG_EXECUTE_CARD.data.actor,
				})
				.then(async (card) => {
					expect(card.data.payload).toEqual(BIG_EXECUTE_CARD.data.payload);

					// Wait a bit for `postgres.upsertObject` to terminate
					// Otherwise, we close the underlying connections while the rest
					// of the code of upsertObject is still running, causing errors
					// unrelated to the test
					await Bluebird.delay(500);
					done();
				})
				.catch(done);

			Bluebird.delay(500)
				.then(() => {
					// Use the backend class directly so we can inject "links"
					return context.backend
						.insertElement(context.context, BIG_EXECUTE_CARD)
						.then((execute) => {
							expect(omit(execute, ['id'])).toEqual(
								Object.assign({}, BIG_EXECUTE_CARD, {
									created_at: execute.created_at,
									linked_at: execute.linked_at,
									links: execute.links,
								}),
							);
						});
				})
				.catch(done);
		});

		test('should be able to access the event payload', async () => {
			const id = context.generateRandomID();
			await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: id,
				},
			);

			const card = await events.wait(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
				},
			);

			expect(card.data.payload).toEqual({
				action: '57692206-8da2-46e1-91c9-159b2c6928ef',
				card: '033d9184-70b2-4ec9-bc39-9a249b186422',
				timestamp: '2018-06-30T19:34:42.829Z',
				error: false,
				data: id,
			});
		});

		test('should ignore cards that do not match the id', async (done) => {
			expect.assertions(1);

			const id1 = context.generateRandomID();
			events
				.wait(context.context, context.kernel, context.session, {
					id: id1,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
				})
				.then(async (request) => {
					expect(request.data.payload.timestamp).toBe(
						'2020-06-30T19:34:42.829Z',
					);

					// Wait a bit for `postgres.upsertObject` to terminate
					// Otherwise, we close the underlying connections while the rest
					// of the code of upsertObject is still running, causing errors
					// unrelated to the test
					await Bluebird.delay(500);
					done();
				})
				.catch(done);

			const id2 = context.generateRandomID();
			Bluebird.delay(500)
				.then(async () => {
					await events.post(
						context.context,
						context.kernel,
						context.session,
						{
							id: id2,
							action: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
							card: '033d9184-70b2-4ec9-bc39-9a249b186422',
							actor: '414f2345-4f5e-4571-820f-28a49731733d',
							timestamp: '2018-06-30T19:34:42.829Z',
						},
						{
							error: false,
							data: {
								id: id2,
							},
						},
					);

					await events.post(
						context.context,
						context.kernel,
						context.session,
						{
							id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
							action: '033d9184-70b2-4ec9-bc39-9a249b186422',
							card: id2,
							actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
							timestamp: '2019-06-30T19:34:42.829Z',
						},
						{
							error: false,
							data: {
								id: id2,
							},
						},
					);

					await events.post(
						context.context,
						context.kernel,
						context.session,
						{
							id: id1,
							action: '57692206-8da2-46e1-91c9-159b2c6928ef',
							card: '033d9184-70b2-4ec9-bc39-9a249b186422',
							actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
							timestamp: '2020-06-30T19:34:42.829Z',
						},
						{
							error: false,
							data: {
								id2,
							},
						},
					);
				})
				.catch(done);
		});
	});

	describe('.getLastExecutionEvent', () => {
		test('should return the last execution event given one event', async () => {
			const id = context.generateRandomID();
			const card = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id,
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: '414f2345-4f5e-4571-820f-28a49731733d',
				},
			);

			const event = await events.getLastExecutionEvent(
				context.context,
				context.kernel,
				context.session,
				'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
			);

			expect(event).toEqual(
				context.kernel.defaults({
					created_at: card.created_at,
					id: card.id,
					name: null,
					slug: event.slug,
					type: 'execute@1.0.0',
					version: '1.0.0',
					data: {
						actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
						originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
						target: id,
						timestamp: event.data.timestamp,
						payload: {
							action: '57692206-8da2-46e1-91c9-159b2c6928ef',
							card: '033d9184-70b2-4ec9-bc39-9a249b186422',
							data: '414f2345-4f5e-4571-820f-28a49731733d',
							error: false,
							timestamp: '2018-06-30T19:34:42.829Z',
						},
					},
				}),
			);
		});

		test('should return the last event given a matching and non-matching event', async () => {
			const originator = context.generateRandomID();

			const card1 = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id: context.generateRandomID(),
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					originator,
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id: context.generateRandomID(),
					},
				},
			);

			await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id: context.generateRandomID(),
					action: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
					card: '5201aae8-c937-4f92-940d-827d857bbcc2',
					actor: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
					originator,
					timestamp: '2018-08-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id: 'a5acb93e-c949-4d2c-859c-62c8949fdfe6',
					},
				},
			);

			const event = await events.getLastExecutionEvent(
				context.context,
				context.kernel,
				context.session,
				originator,
			);

			expect(event).toEqual(
				context.kernel.defaults({
					created_at: card1.created_at,
					id: card1.id,
					slug: event.slug,
					type: 'execute@1.0.0',
					name: null,
					version: '1.0.0',
					data: {
						actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
						originator,
						target: card1.data.target,
						timestamp: event.data.timestamp,
						payload: {
							action: '57692206-8da2-46e1-91c9-159b2c6928ef',
							card: '033d9184-70b2-4ec9-bc39-9a249b186422',
							data: card1.data.payload.data,
							error: false,
							timestamp: '2018-06-30T19:34:42.829Z',
						},
					},
				}),
			);
		});

		test('should return the last execution event given two matching events', async () => {
			const originator = context.generateRandomID();

			const card1 = await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id: context.generateRandomID(),
					action: '57692206-8da2-46e1-91c9-159b2c6928ef',
					card: '033d9184-70b2-4ec9-bc39-9a249b186422',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					originator,
					timestamp: '2018-06-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id: '414f2345-4f5e-4571-820f-28a49731733d',
					},
				},
			);

			await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id: context.generateRandomID(),
					action: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
					card: '5201aae8-c937-4f92-940d-827d857bbcc2',
					actor: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
					originator,
					timestamp: '2018-03-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id: 'a5acb93e-c949-4d2c-859c-62c8949fdfe6',
					},
				},
			);

			const event = await events.getLastExecutionEvent(
				context.context,
				context.kernel,
				context.session,
				originator,
			);

			expect(event).toEqual(
				context.kernel.defaults({
					created_at: card1.created_at,
					id: card1.id,
					slug: event.slug,
					name: null,
					type: 'execute@1.0.0',
					version: '1.0.0',
					links: {},
					data: {
						actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
						originator,
						target: card1.data.target,
						timestamp: event.data.timestamp,
						payload: {
							action: '57692206-8da2-46e1-91c9-159b2c6928ef',
							card: '033d9184-70b2-4ec9-bc39-9a249b186422',
							data: card1.data.payload.data,
							error: false,
							timestamp: '2018-06-30T19:34:42.829Z',
						},
					},
				}),
			);
		});

		test('should return null given no matching event', async () => {
			await events.post(
				context.context,
				context.kernel,
				context.session,
				{
					id: context.generateRandomID(),
					action: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
					card: '5201aae8-c937-4f92-940d-827d857bbcc2',
					actor: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
					originator: '6f3ff72e-5305-4397-b86f-ca1ea5f06f5f',
					timestamp: '2018-03-30T19:34:42.829Z',
				},
				{
					error: false,
					data: {
						id: 'a5acb93e-c949-4d2c-859c-62c8949fdfe6',
					},
				},
			);

			const event = await events.getLastExecutionEvent(
				context.context,
				context.kernel,
				context.session,
				context.generateRandomID(),
			);
			expect(event).toBeNull();
		});

		test('should only consider execute cards', async () => {
			const id = context.generateRandomID();
			await context.kernel.insertCard(context.context, context.session, {
				type: 'card@1.0.0',
				slug: context.generateRandomID(),
				version: '1.0.0',
				data: {
					timestamp: '2018-06-30T19:34:42.829Z',
					target: '57692206-8da2-46e1-91c9-159b2c6928ef',
					actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
					originator: id,
					payload: {
						card: '033d9184-70b2-4ec9-bc39-9a249b186422',
						timestamp: '2018-06-32T19:34:42.829Z',
						error: false,
						data: '414f2345-4f5e-4571-820f-28a49731733d',
					},
				},
			});

			const event = await events.getLastExecutionEvent(
				context.context,
				context.kernel,
				context.session,
				id,
			);
			expect(event).toBeNull();
		});
	});
});
