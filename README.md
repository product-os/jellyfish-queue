**Notice: This utility has been discontinued. The functionality provided by this module has been merged into [`jellyfish-worker`](https://github.com/product-os/jellyfish-worker).**

# Jellyfish Queue

The Jellyfish system processes incoming action requests and adds them to a queue so that they can be retrieved and executed in order.

This module provides a small set of functions to perform any queue-related operations, and should be utilized by any module requiring interaction with queued objects.

Note that, although `jellyfish-queue` is mostly used for enqueuing action requests, it could also be used to support handling other types of objects as well.

Under-the-hood, this module makes use of [`graphile-worker`](https://github.com/graphile/worker), a persistent job queue that supports PostgreSQL and can be used to run jobs "in the background" so that application code is not held up.
## Goals

- The queue aims to be fast
- The queue aims to be a layer on top of `jellyfish-core` to allow for the effective management of queued objects of any type.

# Usage

Below is an example how to use this library:

```ts
import { Consumer } from '@balena/jellyfish-queue';
import type { ActionRequestContract } from '@balena/jellyfish-types/build/core';

const producer = new Producer(kernel, kernel.sessions.admin);
await producer.initialize(context);

const consumer = new Consumer(kernel, kernel.sessions.admin);
await consumer.initializeWithEventHandler(
  logContext,
  async (payload: ActionRequestContract): void => {
    console.log("Message received: ", payload)
  }
)
```
# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-queue/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-queue/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-queue

# Testing

Unit tests can be easily run with the command `npm test`.

The integration tests require Postgres and Redis instances. The simplest way to run the tests locally is with `docker-compose`.

```
$ npm run test:compose
```

You can also run tests locally against Postgres and Redis instances running in `docker-compose`:
```
$ npm run compose
$ REDIS_HOST=localhost POSTGRES_HOST=localhost npx jest test/integration/queue/index.spec.ts
```

You can also access these Postgres and Redis instances:
```
$ PGPASSWORD=docker psql -hlocalhost -Udocker
$ redis-cli -h localhost
```
