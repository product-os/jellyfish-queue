/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const ava = require('ava')
const events = require('./events')

ava('.getExecuteEventSlug() generates a valid slug', (test) => {
	const eventSlug = events.getExecuteEventSlug({
		id: 'test'
	})
	test.is(eventSlug, 'execute-test')
})
