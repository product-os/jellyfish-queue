/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const _ = require('lodash')
const Bluebird = require('bluebird')
const helpers = require('./helpers')
const {
	events
} = require('../../../lib')

ava.serial.before(helpers.before)
ava.serial.after(helpers.after)

ava('.post() should insert an active execute card', async (test) => {
	const id = test.context.generateRandomID()
	const event = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: id
	})

	const card = await test.context.jellyfish.getCardById(test.context.context, test.context.session, event.id)
	test.true(card.active)
	test.is(card.type, 'execute@1.0.0')
})

ava('.post() should set a present timestamp', async (test) => {
	const currentDate = new Date()
	const id = test.context.generateRandomID()

	const card = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: id
	})

	test.true(new Date(card.data.timestamp) >= currentDate)
})

ava('.post() should not use a passed id', async (test) => {
	const id = test.context.generateRandomID()
	const card = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	test.not(card.id, id)
})

ava('.post() should fail if no result error', async (test) => {
	const id = test.context.generateRandomID()
	await test.throwsAsync(events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: 'action-create-card@1.0.0',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		data: id
	}), {
		instanceOf: test.context.jellyfish.errors.JellyfishSchemaMismatch
	})
})

ava('.post() should use the passed timestamp in the payload', async (test) => {
	const id = test.context.generateRandomID()
	const card = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: id
	})

	test.is(card.data.payload.timestamp, '2018-06-30T19:34:42.829Z')
	test.not(card.data.payload.timestamp, card.data.timestamp)
})

ava('.post() should allow an object result', async (test) => {
	const card = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id: test.context.generateRandomID(),
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: {
			value: 5
		}
	})

	test.deepEqual(card.data.payload.data, {
		value: 5
	})
})

ava.cb('.wait() should return when a certain execute event is inserted', (test) => {
	const id = test.context.generateRandomID()
	events.wait(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef'
	}).then(async () => {
		// Wait a bit for `postgres.upsertObject` to terminate
		// Otherwise, we close the underlying connections while the rest
		// of the code of upsertObject is still running, causing errors
		// unrelated to the test
		await Bluebird.delay(500)
		test.end()
	}).catch(test.end)

	Bluebird.delay(500).then(() => {
		return events.post(test.context.context, test.context.jellyfish, test.context.session, {
			id,
			action: '57692206-8da2-46e1-91c9-159b2c6928ef',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2018-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: id
		})
	}).catch(test.end)
})

ava('.wait() should return if the card already exists', async (test) => {
	const id = test.context.generateRandomID()
	await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: id
	})

	const card = await events.wait(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef'
	})

	test.is(card.type, 'execute@1.0.0')
	test.is(card.data.target, id)
	test.is(card.data.actor, '57692206-8da2-46e1-91c9-159b2c6928ef')
	test.is(card.data.payload.card, '033d9184-70b2-4ec9-bc39-9a249b186422')
})

ava.cb('.wait() should be able to access the event payload of a huge event', (test) => {
	const BIG_EXECUTE_CARD = require('./big-execute.json')

	events.wait(
		test.context.context, test.context.jellyfish, test.context.session, {
			id: BIG_EXECUTE_CARD.slug.replace(/^execute-/g, ''),
			action: BIG_EXECUTE_CARD.data.action,
			card: BIG_EXECUTE_CARD.data.target,
			actor: BIG_EXECUTE_CARD.data.actor
		}).then(async (card) => {
		test.deepEqual(card.data.payload, BIG_EXECUTE_CARD.data.payload)

		// Wait a bit for `postgres.upsertObject` to terminate
		// Otherwise, we close the underlying connections while the rest
		// of the code of upsertObject is still running, causing errors
		// unrelated to the test
		await Bluebird.delay(500)
		test.end()
	}).catch(test.end)

	Bluebird.delay(500).then(() => {
		// Use the backend class directly so we can inject "links"
		return test.context.backend.insertElement(
			test.context.context, BIG_EXECUTE_CARD).then((execute) => {
			test.deepEqual(_.omit(execute, [ 'id' ]), Object.assign({}, BIG_EXECUTE_CARD, {
				created_at: execute.created_at,
				linked_at: execute.linked_at,
				links: execute.links
			}))
		})
	}).catch(test.end)
})

ava('.wait() should be able to access the event payload', async (test) => {
	const id = test.context.generateRandomID()
	await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: id
	})

	const card = await events.wait(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef'
	})

	test.deepEqual(card.data.payload, {
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		timestamp: '2018-06-30T19:34:42.829Z',
		error: false,
		data: id
	})
})

ava.cb('.wait() should ignore cards that do not match the id', (test) => {
	const id1 = test.context.generateRandomID()
	events.wait(test.context.context, test.context.jellyfish, test.context.session, {
		id: id1,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef'
	}).then(async (request) => {
		test.is(request.data.payload.timestamp, '2020-06-30T19:34:42.829Z')

		// Wait a bit for `postgres.upsertObject` to terminate
		// Otherwise, we close the underlying connections while the rest
		// of the code of upsertObject is still running, causing errors
		// unrelated to the test
		await Bluebird.delay(500)
		test.end()
	}).catch(test.end)

	const id2 = test.context.generateRandomID()
	Bluebird.delay(500).then(async () => {
		await events.post(test.context.context, test.context.jellyfish, test.context.session, {
			id: id2,
			action: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '414f2345-4f5e-4571-820f-28a49731733d',
			timestamp: '2018-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: id2
		})

		await events.post(test.context.context, test.context.jellyfish, test.context.session, {
			id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
			action: '033d9184-70b2-4ec9-bc39-9a249b186422',
			card: id2,
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2019-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: id2
		})

		await events.post(test.context.context, test.context.jellyfish, test.context.session, {
			id: id1,
			action: '57692206-8da2-46e1-91c9-159b2c6928ef',
			card: '033d9184-70b2-4ec9-bc39-9a249b186422',
			actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
			timestamp: '2020-06-30T19:34:42.829Z'
		}, {
			error: false,
			data: id2
		})
	}).catch(test.end)
})

ava('.getLastExecutionEvent() should return the last execution event given one event', async (test) => {
	const id = test.context.generateRandomID()
	const card = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id,
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	const event = await events.getLastExecutionEvent(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		'cb3523c5-b37d-41c8-ae32-9e7cc9309165')

	test.deepEqual(event, test.context.kernel.defaults({
		created_at: card.created_at,
		id: card.id,
		name: null,
		slug: event.slug,
		type: 'execute@1.0.0',
		version: '1.0.0',
		links: {},
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
				timestamp: '2018-06-30T19:34:42.829Z'
			}
		}
	}))
})

ava('.getLastExecutionEvent() should return the last event given a matching and non-matching event', async (test) => {
	const originator = test.context.generateRandomID()

	const card1 = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id: test.context.generateRandomID(),
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		originator,
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: test.context.generateRandomID()
	})

	await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id: test.context.generateRandomID(),
		action: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
		card: '5201aae8-c937-4f92-940d-827d857bbcc2',
		actor: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
		originator,
		timestamp: '2018-08-30T19:34:42.829Z'
	}, {
		error: false,
		data: 'a5acb93e-c949-4d2c-859c-62c8949fdfe6'
	})

	const event = await events.getLastExecutionEvent(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		originator)

	test.deepEqual(event, test.context.kernel.defaults({
		created_at: card1.created_at,
		id: card1.id,
		slug: event.slug,
		type: 'execute@1.0.0',
		name: null,
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
				timestamp: '2018-06-30T19:34:42.829Z'
			}
		}
	}))
})

ava('.getLastExecutionEvent() should return the last execution event given two matching events', async (test) => {
	const originator = test.context.generateRandomID()

	const card1 = await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id: test.context.generateRandomID(),
		action: '57692206-8da2-46e1-91c9-159b2c6928ef',
		card: '033d9184-70b2-4ec9-bc39-9a249b186422',
		actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
		originator,
		timestamp: '2018-06-30T19:34:42.829Z'
	}, {
		error: false,
		data: '414f2345-4f5e-4571-820f-28a49731733d'
	})

	await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id: test.context.generateRandomID(),
		action: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
		card: '5201aae8-c937-4f92-940d-827d857bbcc2',
		actor: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
		originator,
		timestamp: '2018-03-30T19:34:42.829Z'
	}, {
		error: false,
		data: 'a5acb93e-c949-4d2c-859c-62c8949fdfe6'
	})

	const event = await events.getLastExecutionEvent(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		originator)

	test.deepEqual(event, test.context.kernel.defaults({
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
				timestamp: '2018-06-30T19:34:42.829Z'
			}
		}
	}))
})

ava('.getLastExecutionEvent() should return null given no matching event', async (test) => {
	await events.post(test.context.context, test.context.jellyfish, test.context.session, {
		id: test.context.generateRandomID(),
		action: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
		card: '5201aae8-c937-4f92-940d-827d857bbcc2',
		actor: 'e4fe3f19-13ae-4421-b28f-6507af78d1f6',
		originator: '6f3ff72e-5305-4397-b86f-ca1ea5f06f5f',
		timestamp: '2018-03-30T19:34:42.829Z'
	}, {
		error: false,
		data: 'a5acb93e-c949-4d2c-859c-62c8949fdfe6'
	})

	const event = await events.getLastExecutionEvent(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		test.context.generateRandomID())
	test.deepEqual(event, null)
})

ava('.getLastExecutionEvent() should only consider execute cards', async (test) => {
	const id = test.context.generateRandomID()
	await test.context.jellyfish.insertCard(test.context.context, test.context.session, {
		type: 'card@1.0.0',
		slug: test.context.generateRandomID(),
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
				data: '414f2345-4f5e-4571-820f-28a49731733d'
			}
		}
	})

	const event = await events.getLastExecutionEvent(
		test.context.context,
		test.context.jellyfish,
		test.context.session,
		id)
	test.deepEqual(event, null)
})
