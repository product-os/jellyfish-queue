/*
 * Copyright (C) Balena.io - All Rights Reserved
 * Unauthorized copying of this file, via any medium is strictly prohibited.
 * Proprietary and confidential.
 */

const Consumer = require('./consumer')
const Producer = require('./producer')
const errors = require('./errors')
const events = require('./events')

/**
 * Queue module for Jellyfish.
 *
 * @module queue
 */

exports.Consumer = Consumer
exports.Producer = Producer
exports.errors = errors
exports.events = events
