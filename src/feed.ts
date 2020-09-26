//------------------------------------------------------------------------- feed
/**
 * @note Feed relies on requestAnimationFrame for rate limiting, if it is not
 *       available, consider a polyfill like https://www.npmjs.com/package/raf
 */

/**
 * Define Subscriber callback.
 */
export interface Subscriber<T> {
  (value: T): void;
}

/**
 * Define Feed object.
 */
export interface Feed<T> {
  subscribers: Subscriber<T>[];
  value: T;
  _pending: number;
  _timeout: number;
  notify: () => Promise<this>;
  subscribe: (subscriber: Subscriber<T>, priority?: number) => this;
  drop: (subscriber: Subscriber<T>) => this;
  dropAll: () => this;
  get: () => T;
  push: (value: T) => this;
  setUnbound: (value: T) => this;
  setDebounced: (value: T) => this;
  setThrottled: (value: T) => this;
}

/**
 * Define FeedOptions object used in Feed constructor.
 */
export enum RateLimit {
  none = 'none',
  debounce = 'debounce',
  throttle = 'throttle',
}

/**
 * Define Feed constructor.
 */
export type FeedCtor = {
  new <T>(value: T, rateLimit?: RateLimit): Feed<T>;
};

/**
 * Create a new Feed object.
 *
 * @note To resolve notifications according to subscribers priority and
 *       insertion order, notify() Awaits each subscriber's callback in
 *       turn. -> not used right now.
 *
 * @todo Consider returning a function that drop the just registered subscriber
 *       from subscribe method.
 */
export const Feed = (function <T>(
  this: Feed<T>,
  value: T,
  rateLimit: RateLimit = RateLimit.throttle
): Feed<T> {
  if (!new.target) {
    throw 'Feed() must be called with new !';
  }
  this.subscribers = [];
  this.value = value;
  /** Internal state for rate limiting if any. */
  this._pending = 0;
  this._timeout = 0;

  // const instance = this;
  this.push = ((rateLimit: RateLimit) => {
    switch (rateLimit) {
      case RateLimit.none:
        return (value: T): Feed<T> => {
          /* The buck stops here. */
          if (value !== this.value) {
            this.value = value;
            this.notify();
          }
          return this;
        };
      // return this.setUnbound.bind(this);
      case RateLimit.debounce:
        // return this.setDebounced.bind(this);
        return (value: T): Feed<T> => {
          // console.log('set', this._pending, this.value);
          /* The buck stops here. */
          if (value !== this.value) {
            this.value = value;

            /** Cancel pending notification. */
            if (this._pending) {
              window.cancelAnimationFrame(this._pending);
              // console.log('Cancel notify', this._pending, this.value);
            }

            /** Schedule notification on next frame. */
            this._pending = window.requestAnimationFrame(() => {
              this.notify();
              // console.log(' ----> Notify', this._pending, this.value);
              this._pending = 0;
            });
            // console.log('Schedule notify', this._pending, this.value);
          }
          return this;
        };
      case RateLimit.throttle:
        return (value: T): Feed<T> => {
          /* The buck stops here. */
          if (value !== this.value) {
            this.value = value;

            if (!this._pending) {
              /** Notify immediately if not on timeout. */
              if (!this._timeout) {
                this.notify();
                // console.log(
                //   '----> LeadNotify',
                //   this._pending,
                //   this.value
                // );
                /** Prevent further immediate notification until next frame. */
                this._timeout = window.requestAnimationFrame(
                  () => (this._timeout = 0)
                );
              } else {
                /** Schedule notification on next frame. */
                this._pending = window.requestAnimationFrame(
                  (now: DOMHighResTimeStamp) => {
                    window.cancelAnimationFrame(this._pending);

                    this.notify();
                    // console.log(
                    //   ' ----> Notify',
                    //   this._pending,
                    //   this.value,
                    //   now
                    // );
                    this._pending = 0;
                  }
                );
                // console.log('Schedule notify', this._pending, this.value);
              }
            }
          }
          return this;
        };
    }
  })(rateLimit);
  return this;
} as any) as FeedCtor;

/**
 *
 */
Feed.prototype.notify = function <T>(): Feed<T> {
  // const length = this.subscribers.length;
  // const tasks = new Array(length);
  // console.log(this.subscribers);
  for (let i = 0, length = this.subscribers.length; i < length; i++) {
    // console.log('notifying ' + this.subscribers[i]);
    // tasks.push(this.subscribers[i](this.value));
    // tasks[i] = this.subscribers[i](this.value);
    // await this.subscribers[i](this.value);
    this.subscribers[i](this.value);
  }
  /** @todo consider ES2020 Promise.allSettled */
  // await Promise.all(tasks);
  return this;
};

/**
 * Register a Subscriber to this Feed.
 * 
 * @param priority Optional parameter priority is the index where given
 *                 Subscriber is going to be 'spliced' in the subscribers list.
 *                 If no paramater is supplied, given Subscriber is appended.
 */
Feed.prototype.subscribe = function <T>(
  subscriber: Subscriber<T>,
  priority?: number
): Feed<T> {
  if (priority === undefined) {
    this.subscribers.push(subscriber);
  } else {
    this.subscribers.splice(priority, 0, subscriber);
  }
  return this;
};

/**
 * Drop a specific subscriber given its reference.
 */
Feed.prototype.drop = function <T>(
  subscriber: Subscriber<T>
): Feed<T> {
  this.subscribers = this.subscribers.filter(
    (s: Subscriber<T>) => s !== subscriber
  );
  return this;
};

/**
 * Drop all subscribers.
 */
Feed.prototype.dropAll = function <T>(): Feed<T> {
  this.subscribers = [];
  return this;
};

/**
 * Get Feed latest/current value.
 */
Feed.prototype.get = function <T>(): T {
  /* Notify that a read is happening here if necessary. */
  return this.value;
};