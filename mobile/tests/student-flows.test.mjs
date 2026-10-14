import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createSaveQueue } from '../utils/saveQueue.js';
import { nearestRoute } from '../utils/routeOptimization.js';
import { notificationRoute } from '../utils/notificationText.js';

test('rapid full-trip saves never overlap and only the newest queued edit is sent', async () => {
  const sent = [];
  let release;
  let active = 0;
  const queue = createSaveQueue(async (body) => {
    assert.equal(++active, 1);
    sent.push(body);
    if (body.revision === 1) await new Promise((resolve) => { release = resolve; });
    active--;
  });
  const first = queue.save({ revision: 1 });
  const second = queue.save({ revision: 2 });
  const third = queue.save({ revision: 3 });
  release();
  assert.deepEqual(await Promise.all([first, second, third]), [true, true, true]);
  assert.deepEqual(sent, [{ revision: 1 }, { revision: 3 }]);
});

test('a failed save retains the newest changes for retry and reports failure', async () => {
  let reject;
  let fail = true;
  const sent = [];
  const states = [];
  const queue = createSaveQueue(async (body) => {
    sent.push(body);
    if (fail) await new Promise((_, rejectPromise) => { reject = rejectPromise; });
  }, (state) => states.push(state));
  const result = queue.save({ revision: 1 });
  queue.save({ revision: 2 });
  reject(new Error('Offline'));
  assert.equal(await result, false);
  assert.equal(states.at(-1).status, 'failed');
  fail = false;
  assert.equal(await queue.retry(), true);
  assert.deepEqual(sent, [{ revision: 1 }, { revision: 2 }]);
  assert.equal(states.at(-1).status, 'saved');
});

test('notification destinations preserve student class and Tour Day context', () => {
  assert.equal(notificationRoute({ link: '/classes/12' }), '/classes/12');
  assert.equal(notificationRoute({ link: '/classes' }), '/classes');
  assert.equal(notificationRoute({ link: '/trip-plan/tour?tripId=7&date=2026-10-14' }), '/tour/7?date=2026-10-14');
  assert.equal(notificationRoute({ link: '/trip-plan?tripId=7' }), '/trip/7');
  assert.equal(notificationRoute({ link: '/journal/view/9' }), '/journal/9');
  assert.equal(notificationRoute({ data: '{"classId":12}' }), '/classes/12');
  assert.equal(notificationRoute({ data: 'broken JSON' }), null);
});

test('route candidates preserve the start, include every stop once and do not mutate input', () => {
  const stops = [{ key: 'start', latitude: 0, longitude: 0 }, { key: 'far', latitude: 0, longitude: 3 }, { key: 'near', latitude: 0, longitude: 1 }];
  const result = nearestRoute(stops);
  assert.deepEqual(result.map((stop) => stop.key), ['start', 'near', 'far']);
  assert.deepEqual(stops.map((stop) => stop.key), ['start', 'far', 'near']);
  assert.equal(nearestRoute([]).length, 0);
});
