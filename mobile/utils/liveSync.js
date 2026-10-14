export function startLiveSync(
  load,
  {
    interval = 5000,
    isActive = () => true,
    subscribe,
  } = {}
) {
  let disposed = false;
  let running = false;
  let timer;
  let generation = 0;

  const run = async () => {
    clearTimeout(timer);

    if (disposed || running || !isActive()) {
      return;
    }

    running = true;
    const ticket = generation;

    const isCurrent = () =>
      !disposed &&
      ticket === generation &&
      isActive();

    try {
      await load(isCurrent);
    } catch {
      // Keep the last successful data during temporary failures.
    } finally {
      running = false;

      if (!disposed && isActive()) {
        timer = setTimeout(run, interval);
      }
    }
  };

  const wake = () => {
    generation += 1;
    clearTimeout(timer);

    if (isActive()) {
      void run();
    }
  };

  const unsubscribe = subscribe?.(wake);

  void run();

  return () => {
    disposed = true;
    generation += 1;
    clearTimeout(timer);
    unsubscribe?.();
  };
}