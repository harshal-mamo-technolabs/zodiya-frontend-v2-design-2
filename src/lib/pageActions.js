/* Lets the astrologer act on a page: the page registers what it can do while
   it is mounted, and the agent's tool calls run through here. */
const handlers = {};

export function registerPage(name, fn) {
  handlers[name] = fn;
  return () => { if (handlers[name] === fn) delete handlers[name]; };
}

/* Waits a moment for the page to mount, since the call often comes right
   after navigating to it. */
export async function runOnPage(name, args, waitMs = 4000) {
  const until = Date.now() + waitMs;
  while (!handlers[name] && Date.now() < until) await new Promise(r => setTimeout(r, 100));
  if (!handlers[name]) return 'The page did not open. Nothing was done.';
  return handlers[name](args);
}
