/**
 * Runs at most `max` of the tasks it is handed at once; the rest wait their turn, in the order they were handed in.
 *
 * The organisers' batch print reads the members of up to fifty branches. Asked all together, that is fifty requests at
 * one moment against a hosted server sized for a handful -- so they are asked a few at a time, and the listings fill
 * in branch by branch, in the order typed.
 *
 * @param {number} max how many tasks may run at once
 * @returns {(task: () => Promise<T>) => Promise<T>} hands a task in; settles as the task does
 * @template T
 */
export function createLimiter(max) {
  let running = 0;
  const waiting = [];

  const next = () => {
    if (running >= max || waiting.length === 0) return;
    running += 1;
    const { task, resolve, reject } = waiting.shift();
    Promise.resolve()
      .then(task)
      .then(resolve, reject)
      .finally(() => {
        running -= 1;
        next();
      });
  };

  return (task) => new Promise((resolve, reject) => {
    waiting.push({ task, resolve, reject });
    next();
  });
}
