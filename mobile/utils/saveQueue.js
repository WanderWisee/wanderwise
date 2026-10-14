export function createSaveQueue(write, notify = () => {}) {
  let pending = null;
  let running = null;
  function drain() {
    if (running) return running;
    if (!pending) return Promise.resolve(true);
    notify({ status: 'saving', error: '' });
    const task = (async () => {
      while (pending) {
        const body = pending;
        pending = null;
        try {
          await write(body);
          notify({ savedBody: JSON.stringify(body) });
        } catch (error) {
          if (!pending) pending = body;
          notify({ status: 'failed', error: error.message });
          return false;
        }
      }
      notify({ status: 'saved', error: '' });
      return true;
    })();
    running = task;
    void task.finally(() => { running = null; });
    return task;
  }
  return {
    save(body) { pending = body; return drain(); },
    retry: drain,
  };
}
