# Jellyfish Queue

The Jellyfish system processes incoming action requests and adds them to a
queue. The system can dequeue the next action request, execute it, and post the
results back. This module provides a small set of functions to perform any
action request queue-related operations.

No module that interacts with the action request queue should try to bypass
this module.

## Goals

- The queue aims to be fast
- The queue aims to be a layer on top of the core to effectively manage action requests
- The queue aims to be the source of truth of how action requests are marked as
  executed and how action requests results are propagated back

# Usage

Below is an example how to use this library:

```js
import { Consumer } from '@balena/jellyfish-queue';

const myConsumer = new Consumer(jellyfish, jellyfish.sessions.admin);
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
$ REDIS_HOST=localhost POSTGRES_HOST=localhost POSTGRES_USER=docker POSTGRES_PASSWORD=docker npx jest test/integration/example.spec.ts
```

You can also access these Postgres and Redis instances:
```
$ PGPASSWORD=docker psql -hlocalhost -Udocker
$ redis-cli -h localhost
```
