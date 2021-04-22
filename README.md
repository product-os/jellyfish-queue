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
const Consumer = require('@balena/jellyfish-queue').Consumer;

const myConsumer = new Consumer(jellyfish, jellyfish.sessions.admin);
```

# Documentation

[![Publish Documentation](https://github.com/product-os/jellyfish-queue/actions/workflows/publish-docs.yml/badge.svg)](https://github.com/product-os/jellyfish-queue/actions/workflows/publish-docs.yml)

Visit the website for complete documentation: https://product-os.github.io/jellyfish-queue

# Testing

Running integration tests requires a running postgres database and redis server. The easiest way to do this is to use docker-compose.

```
docker-compose -f docker-compose.yml -f docker-compose.test.yml up --build
```

You can then run the integration tests from your host with:

```
POSTGRES_USER=docker POSTGRES_PASSWORD=docker npm run test-integration
```
