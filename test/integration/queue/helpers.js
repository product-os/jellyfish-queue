/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Bluebird = require('bluebird')
const helpers = require('../backend-helpers')
const uuid = require('@balena/jellyfish-uuid')
const actionLibrary = require('@balena/jellyfish-action-library')
const queue = require('../../../lib')
const Consumer = queue.Consumer
const Producer = queue.Producer
const queueErrors = queue.errors

exports.before = async (test, options) => {
	await helpers.before(test, options && {
		suffix: options.suffix
	})
	test.context.jellyfish = test.context.kernel
	test.context.session = test.context.jellyfish.sessions.admin

	const session = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, test.context.session)
	test.context.actor = await test.context.jellyfish.getCardById(
		test.context.context, test.context.session, session.data.actor)

	await test.context.jellyfish.insertCard(test.context.context, test.context.session,
		actionLibrary['action-create-card'].card)

	test.context.queue = {}
	test.context.queue.errors = queueErrors

	test.context.queue.consumer = new Consumer(
		test.context.jellyfish,
		test.context.session)

	const consumedActionRequests = []

	await test.context.queue.consumer.initializeWithEventHandler(test.context.context, (actionRequest) => {
		consumedActionRequests.push(actionRequest)
	})

	test.context.queueActor = await uuid.random()

	test.context.dequeue = async (times = 50) => {
		if (consumedActionRequests.length === 0) {
			if (times <= 0) {
				return null
			}

			await Bluebird.delay(10)
			return test.context.dequeue(times - 1)
		}

		return consumedActionRequests.shift()
	}

	test.context.queue.producer = new Producer(
		test.context.jellyfish,
		test.context.session)

	await test.context.queue.producer.initialize(test.context.context)
}

exports.after = async (test) => {
	if (test.context.queue) {
		await test.context.queue.consumer.cancel()
	}

	if (test.context.jellyfish) {
		await helpers.after(test)
	}
}
