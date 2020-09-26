import { Feed, RateLimit, Subscriber } from '.';
//------------------------------------------------------------------------------
it('uses jsdom in this test file', () => {
  const element = document.createElement('div');
  expect(element).not.toBeNull();
});
//------------------------------------------------------------------------------
describe('Feed', () => {
  //----------------------------------------------------------------------------
  it('throws if its constructor is not called with new', () => {
    expect(() => {
      (Feed as any)();
    }).toThrow();
  });
  //----------------------------------------------------------------------------
  it('can create a new Feed of any type', () => {
    expect(new Feed<string>('a string')).toEqual(expect.any(Feed));
    expect(new Feed<number>(2020)).toEqual(expect.any(Feed));
    expect(
      new Feed<Object>({ test: 'a value' })
    ).toEqual(expect.any(Feed));
    expect(
      new Feed<string[]>(['test', 'a value'])
    ).toEqual(expect.any(Feed));
  });

  // it.each([
  //   ['string', 'a string'],
  //   ['number', 2020],
  //   ['Object', { test: 'a value' }],
  //   ['string[]', ['test', 'a value']],
  //   ['function', () => 'value'],
  // ])('can create a new Feed of type %s', (type, value) => {
  //   expect(new Feed(value)).toEqual(expect.any(Feed));
  // });
  //----------------------------------------------------------------------------
  it('can return its value', () => {
    const feed = new Feed('a string');
    expect(feed.get()).toBe('a string');
  });
  //----------------------------------------------------------------------------
  it('can have its push method safely passed as a callback', () => {
    const feed = new Feed('a string', RateLimit.none);
    let target = '';
    feed.subscribe((value) => {
      target = value;
    });

    feed.push('regular call');
    expect(target).toBe('regular call');

    const push_from_another_context = feed.push;
    push_from_another_context('from another context');
    expect(target).toBe('from another context');
  });
  //----------------------------------------------------------------------------
  describe('subscribers', () => {
    let feed: Feed<any>;
    let subscribers: Subscriber<any>[];
    let targets: string[];

    beforeEach(() => {
      feed = new Feed('a string', RateLimit.none);
      subscribers = [];
      targets = ['', '', ''];
      targets.forEach((v, i) => {
        subscribers.push((value) => {
          targets[i] = value;
        });
        feed.subscribe(subscribers[i]);
      });
    });
    //--------------------------------------------------------------------------
    it('can subscribe callbacks', () => {
      feed.push('test');
      targets.forEach((v) => expect(v).toBe('test'));
    });
    //--------------------------------------------------------------------------
    it('can subscribe callbacks with a specific priority', () => {
      let me_first = '';
      feed.subscribe((v) => {
        me_first = targets[0] === 'test' ? 'fail' : 'success';
      }, 0);
      feed.push('test');
      expect(me_first).toBe('success');
    });
    //--------------------------------------------------------------------------
    it('can drop all subscribers', () => {
      feed.dropAll();
      feed.push('test');
      targets.forEach((v) => expect(v).toBe(''));
    });
    //--------------------------------------------------------------------------
    it('can drop a specific subscriber given its reference', () => {
      feed.push('test');
      subscribers.forEach((s, i) => {
        feed.drop(s);
        feed.push('test' + i);
        expect(targets[i]).toBe('test');
        feed.push('test');
      });
    });
  });
  //----------------------------------------------------------------------------
  describe('rate limiting', () => {
    //--------------------------------------------------------------------------
    it('can debounce notifications', (done) => {
      let count = 0;
      let target = 0;
      const feed = new Feed(0, RateLimit.debounce);
      feed.subscribe((v) => {
        target = v;
        count++;
      });
      for (let i = 0; i < 1000; i++) {
        feed.push(i);
      }
      window.requestAnimationFrame(() => {
        done();
        expect(count).toBe(1);
        expect(target).toBe(feed.get());
      });
    });
    //--------------------------------------------------------------------------
    it('can throttle notifications', (done) => {
      let count = 0;
      let target = 0;
      const feed = new Feed(0, RateLimit.throttle);
      feed.subscribe((v) => {
        target = v;
        count++;
      });
      for (let i = 0; i < 1000; i++) {
        feed.push(i);
      }
      window.requestAnimationFrame(() => {
        done();
        expect(count).toBe(2);
        expect(target).toBe(feed.get());
      });
    });
    //--------------------------------------------------------------------------
    it('does not trigger notifications on repeat pushes of the same value', () => {
      let count = 0;
      let target = 0;
      const feed = new Feed(0, RateLimit.none);
      feed.subscribe((v) => {
        target = v;
        count++;
      });
      for (let i = 0; i < 100; i++) {
        feed.push(1);
      }
      expect(count).toBe(1);
      expect(target).toBe(feed.get());
    });
  });
});
