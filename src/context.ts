//---------------------------------------------------------------------- context
/**
 * Help manage an heterogenous collection of Feeds.
 * Provide a declarative way to pub/sub DOM element properties.
 */
import { Feed, Subscriber } from './feed';

/**
 * Define Sub object.
 *
 * @var source Source feed.
 * @var target Property to target with update inside the downstream Node.
 * @var type Feed value type.
 *
 * @todo Add Tag / component / render function callback.
 */
export interface Sub<T> {
  source: Feed<T>;
  target: string;
  type: string;
  node: Node;
}

/**
 * Define Context object.
 *
 * @note Because Context relies on apply() to concatenate arrays it can only
 *       handle up to 65536 subs.
 * @note pub and merge will clobber existing entries.
 *
 * @note When an Feed is pub-ed to a Context, it is considered to be
 *       managed by said Context. Context will mercilessly add or drop all
 *       subscribers from any Feed it manages wether or not one fiddled
 *       with a managed Feed directly.
 */
export interface Context {
  pins: { [name: string]: Feed<any> };
  // pins: Map<string, Feed<any>>;
  subs: Sub<any>[];
  pub: (
    name: string,
    feed: Feed<any>,
    ...subscribers: Subscriber<any>[]
  ) => this;
  sub: (name: string, ...subscribers: Subscriber<any>[]) => this;
  remove: (name: string) => this;
  merge: (
    another_context: Context | { [name: string]: Feed<any> }
  ) => Context;
  musterPubs: (element: ParentNode) => this;
  musterSubs: (element: ParentNode) => this;
  muster: (element: ParentNode) => this;
  // setSubs: (pins: Sub<any>[]) => this;
  // activate: (name: string) => this;
  // deactivate: (name: string) => this;
  activateAll: () => this;
  deactivateAll: () => this;
  refresh: () => this;
  // set: <K extends keyof Context['pins']>(
  //   name: K,
  //   value: Context['pins'][K][value]
  // ) => this;
  // [extension: string]: any; // open for extension.
}

/**
 * Define Context constructor.
 */
export type ContextCtor = { new (): Context };

/**
 * Create a new Context object.
 */
export const Context = (function (this: Context): Context {
  if (!new.target) {
    throw 'Context() must be called with new !';
  }
  this.pins = {};
  // this.pins = new Map();
  this.subs = [];
  return this;
} as any) as ContextCtor;

/**
 * Register a Feed as a pin in this context and optionally immediately
 * sub given Subscribers to it.
 */
Context.prototype.pub = function (
  name: string,
  pin: Feed<any>,
  ...subscribers: Subscriber<any>[]
): Context {
  this.pins[name] = pin;
  // this.pins.push(name, pin);
  for (let i = 0, length = subscribers.length; i < length; i++) {
    pin.subscribe(subscribers[i]);
  }
  return this;
};

/**
 * Subscribe given Subscribers to a known pin given its name.
 */
Context.prototype.sub = function (
  name: string,
  ...subscribers: Subscriber<any>[]
): Context {
  if (!(name in this.pins)) throw name + ' pin does not exist !';

  for (let i = 0, length = subscribers.length; i < length; i++) {
    this.pins[name].subscribe(subscribers[i]);
  }
  return this;
};

/**
 * Remove a Feed pin from this context.
 *
 * @note Remove drops all subscribers from the removed Feed to avoid
 *       dangling subscriptions.
 */
Context.prototype.remove = function (name: string): Context {
  // if (this.pins[name] !== undefined) {
  if (name in this.pins) {
    this.pins[name].dropAll();
    delete this.pins[name];
    // this.pins[name] = undefined;
  }
  // const pin = this.pins.get(name);
  // if (pin) {
  //   pin.dropAll();
  //   this.pins.delete(name);
  // }
  return this;
};

/**
 * Merge Feeds from another given context.
 */
Context.prototype.merge = function (
  another_context: Context | { [name: string]: Feed<any> }
): Context {
  if (another_context.pins !== undefined) {
    another_context = <any>another_context.pins;
  }
  // extend(context.pins, another_context);
  Object.assign(this.pins, another_context);
  return this;
};
/**
 * Collect data pubs declared in given element for this Context.
 *
 * @note A pub is a sub that publishes its initial value as an Feed to
 *       a Context, i.e., it is immediately subscribed to this new
 *       Feed value.
 *
 * @note musterPubs is not idempotent.
 *
 * @throws If sub target is NOT a property of sub node.
 */
Context.prototype.musterPubs = function (element: ParentNode): Context {
  const pub_nodes = [...element.querySelectorAll('[data-pub]')];
  const length = pub_nodes.length;
  const subs: Sub<any>[] = Array(length);

  for (let i = 0; i < length; i++) {
    const source = pub_nodes[i].getAttribute('data-pub') ?? 'error';
    const target = pub_nodes[i].getAttribute('data-prop') ?? 'textContent';

    /** @todo Figure out how to check that target exists */
    // if (!(<any>)[target]) {
    if (!(target in pub_nodes[i])) throw target + ' is not a valid node prop !';

    const initial_value = pub_nodes[i][target as keyof Element];
    this.pub(source, new Feed<typeof initial_value>(initial_value));
    subs[i] = {
      source: this.pins[source],
      // source: this.pins.get(source),
      target: target,
      type: pub_nodes[i].getAttribute('data-type') ?? 'string',
      node: pub_nodes[i],
    };
  }
  Array.prototype.push.apply(this.subs, subs);
  return this;
};

/**
 * Collect data subs declared in given element for this Context.
 *
 * @throws If requested Feed source is NOT found.
 *
 * @todo Consider using a dictionnary and an identifier per sub.
 */
Context.prototype.musterSubs = function (element: ParentNode): Context {
  const sub_nodes = [...element.querySelectorAll('[data-sub]')];
  const length = sub_nodes.length;
  const subs: Sub<any>[] = Array(length);

  for (let i = 0; i < length; i++) {
    const source = sub_nodes[i].getAttribute('data-sub') ?? 'data-sub or';

    // if (!this.pins[source]) throw source + ' pin does not exist !';
    if (!(source in this.pins)) throw source + ' pin does not exist !';

    // const pin = this.pins.get(source);
    // if (!pin) throw source + ' pin does not exist !';

    subs[i] = {
      source: this.pins[source],
      // source: pin,
      target: sub_nodes[i].getAttribute('data-prop') ?? 'textContent',
      type: sub_nodes[i].getAttribute('data-type') ?? 'string',
      node: sub_nodes[i],
    };
  }
  Array.prototype.push.apply(this.subs, subs);
  return this;
};

/**
 * Collect both data pubs & subs declared in given element for this Context.
 *
 * @note Muster pubs first to avoid dangling subs.
 */
Context.prototype.muster = function (element: ParentNode): Context {
  return this.musterPubs(element).musterSubs(element);
};

// /**
//  * Reference given sub collection as this context sub collection.
//  */
// Context.prototype.setSubs = function (subs: Sub<any>[]): Context {
//   this.subs = subs;
//   return this;
// };

/**
 * Activate this context sub collection.
 *
 * @throws If sub target is NOT a property of sub node.
 */
Context.prototype.activateAll = function (): Context {
  for (let i = 0, length = this.subs.length; i < length; i++) {
    const target = this.subs[i].target;
    const node = this.subs[i].node;

    if (!(target in node)) throw target + ' is not a valid node prop !';

    (<Feed<any>>this.subs[i].source).subscribe((value) => {
      node[target] = value;
    });
  }
  return this;
};

Context.prototype.refresh = function (): Context {
  for (const pin of Object.values(this.pins)) {
    (<Feed<any>>pin).notify();
  }
  // for(let [, pin] of this.pins) {
  //   pin.notify();
  // }
  return this;
};
