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
const Consumer = require('@balena/jellyfish-queue').Consumer

const myConsumer = new Consumer(jellyfish, jellyfish.sessions.admin)
```

# Documentation

Queue module for Jellyfish.


* [queue](#module_queue)
    * [.getExecuteEventSlug(options)](#module_queue.getExecuteEventSlug) ⇒ <code>String</code>
    * [.post(context, jellyfish, session, options, results)](#module_queue.post) ⇒ <code>Object</code>
    * [.getLastExecutionEvent(context, jellyfish, session, originator)](#module_queue.getLastExecutionEvent) ⇒ <code>Object</code> \| <code>Null</code>
    * [.wait(context, jellyfish, session, options)](#module_queue.wait) ⇒ <code>Object</code>

<a name="module_queue.getExecuteEventSlug"></a>

### queue.getExecuteEventSlug(options) ⇒ <code>String</code>
**Kind**: static method of [<code>queue</code>](#module_queue)  
**Summary**: Get the slug of an execute event card  
**Returns**: <code>String</code> - slug  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| options | <code>Object</code> | options |
| options.id | <code>String</code> | request id |

<a name="module_queue.post"></a>

### queue.post(context, jellyfish, session, options, results) ⇒ <code>Object</code>
**Kind**: static method of [<code>queue</code>](#module_queue)  
**Summary**: Create request execution event  
**Returns**: <code>Object</code> - event card  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| context | <code>Object</code> | execution context |
| jellyfish | <code>Object</code> | jellyfish instance |
| session | <code>String</code> | session id |
| options | <code>Object</code> | options |
| options.id | <code>String</code> | request id |
| options.actor | <code>String</code> | actor id |
| options.action | <code>String</code> | action id |
| options.timestamp | <code>String</code> | action timestamp |
| options.card | <code>String</code> | action input card id |
| [options.originator] | <code>String</code> | action originator card id |
| results | <code>Object</code> | action results |
| results.error | <code>Boolean</code> | whether the result is an error |
| results.data | <code>Any</code> | action result |

**Example**  
```js
const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
const card = await events.post({ ... }, jellyfish, session, {
  id: '414f2345-4f5e-4571-820f-28a49731733d',
  action: '57692206-8da2-46e1-91c9-159b2c6928ef',
  card: '033d9184-70b2-4ec9-bc39-9a249b186422',
  actor: '57692206-8da2-46e1-91c9-159b2c6928ef',
  originator: 'cb3523c5-b37d-41c8-ae32-9e7cc9309165',
  timestamp: '2018-06-30T19:34:42.829Z'
}, {
  error: false,
  data: '414f2345-4f5e-4571-820f-28a49731733d'
})

console.log(card.id)
```
<a name="module_queue.getLastExecutionEvent"></a>

### queue.getLastExecutionEvent(context, jellyfish, session, originator) ⇒ <code>Object</code> \| <code>Null</code>
**Kind**: static method of [<code>queue</code>](#module_queue)  
**Summary**: Get the last execution event given an originator  
**Returns**: <code>Object</code> \| <code>Null</code> - last execution event  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| context | <code>Object</code> | execution context |
| jellyfish | <code>Object</code> | jellyfish instance |
| session | <code>String</code> | session id |
| originator | <code>String</code> | originator card id |

**Example**  
```js
const originator = '4a962ad9-20b5-4dd8-a707-bf819593cc84'

const executeEvent = await events.getLastExecutionEvent({ ... }, jellyfish, session, originator)
if (executeEvent) {
  console.log(executeEvent.data.timestamp)
}
```
<a name="module_queue.wait"></a>

### queue.wait(context, jellyfish, session, options) ⇒ <code>Object</code>
**Kind**: static method of [<code>queue</code>](#module_queue)  
**Summary**: Wait for an execution request event  
**Returns**: <code>Object</code> - execution request event  
**Access**: public  

| Param | Type | Description |
| --- | --- | --- |
| context | <code>Object</code> | execution context |
| jellyfish | <code>Object</code> | jellyfish instance |
| session | <code>String</code> | session id |
| options | <code>Object</code> | options |
| options.id | <code>String</code> | request id |
| options.actor | <code>String</code> | actor id |

**Example**  
```js
const session = '4a962ad9-20b5-4dd8-a707-bf819593cc84'
const card = await events.wait({ ... }, jellyfish, session, {
  id: '4a962ad9-20b5-4dd8-a707-bf819593cc84',
  card: '033d9184-70b2-4ec9-bc39-9a249b186422'
})

console.log(card.id)
```
