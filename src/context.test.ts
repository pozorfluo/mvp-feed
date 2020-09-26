import { Context, Feed } from '.';
import { RateLimit } from './feed';
//------------------------------------------------------------------------------
it('uses jsdom in this test file', () => {
  const element = document.createElement('div');
  expect(element).not.toBeNull();
});
//------------------------------------------------------------------------------
describe('Context', () => {
  let context: Context;
  let element: HTMLElement;

  beforeEach(() => {
    context = new Context();
    expect(context.subs).toStrictEqual([]);

    element = document.createElement('div');
    element.innerHTML = `
      <span data-pub="test">test string</span>
      <span data-sub="test"></span>
      <input type="text" data-sub="test" data-prop="value" />
    `;
  });
  //----------------------------------------------------------------------------
  it('throws if its constructor is not called with new', () => {
    expect(() => {
      (Context as any)();
    }).toThrow();
  });
  //----------------------------------------------------------------------------
  it('can create a new Context', () => {
    expect(context).toEqual(expect.any(Context));
    // expect(context.pins).toStrictEqual({});
  });
  //----------------------------------------------------------------------------
  it('can muster pubs and subs from a parent Node', () => {
    context.muster(element);
    expect(context.pins).toEqual(
      expect.objectContaining({
        test: expect.any(Feed),
      })
    );
    expect(context.subs.length).toBe(3);
    expect(context.subs).toEqual(
      expect.arrayContaining(
        // [expect.any(Sub)],
        [
          expect.objectContaining({
            source: expect.anything(),
            target: expect.any(String),
            type: expect.any(String),
            node: expect.any(Node),
          }),
        ]
      )
    );
  });
  //----------------------------------------------------------------------------
  it('can activate all previously mustered subs', () => {
    context.muster(element).activateAll();
    expect(context.pins.test.subscribers.length).toBe(3);
  });
  //----------------------------------------------------------------------------
  it('can deactivate all previously mustered subs', () => {
    context.muster(element).deactivateAll();
    expect(context.pins.test.subscribers.length).toBe(0);
  });
  // it('can activate/deactive a single pin without messing activateAll/deactivateAll', () => {
  //   context.muster(element).deactivateAll();
  //   expect(context.pins.test.subscribers.length).toBe(0);
  // });
  //----------------------------------------------------------------------------
  it('can trigger a refresh', () => {
    context.muster(element).activateAll().refresh();
    expect((<HTMLInputElement>element.querySelector('input')).value).toBe(
      'test string'
    );
  });
  //----------------------------------------------------------------------------
  it('throws when trying to muster a pin-less sub', () => {
    element = document.createElement('div');
    element.innerHTML = `
      <span data-sub="pinDoesNotExist"></span>
    `;
    expect(() => {
      context.muster(element);
    }).toThrow();
  });
  //----------------------------------------------------------------------------
  it('throws when trying to muster a pin with an invalid data-prop', () => {
    element = document.createElement('div');
    element.innerHTML = `
      <span data-pub="test" data-prop="invalidTarget"></span>
    `;
    expect(() => {
      context.muster(element);
    }).toThrow();
  });
  //----------------------------------------------------------------------------
  it('throws when trying to activate a sub with an invalid data-prop', () => {
    element = document.createElement('div');
    element.innerHTML = `
      <span data-pub="test"></span>
    `;

    expect(() => {
      context.muster(element);
    }).not.toThrow();

    /** @note brittle */
    context.subs[0].target = 'invalidTarget';

    expect(() => {
      context.activateAll();
    }).toThrow();
  });
  //----------------------------------------------------------------------------
  it('can pub Feed of any type', () => {
    context
      .pub('test_string', new Feed('a string'))
      .pub('test_number', new Feed(1980))
      .pub(
        'test_object',
        new Feed<Object>({ test: 'a value' })
      );
    expect(context.pins).toEqual(
      expect.objectContaining({
        test_string: expect.any(Feed),
        test_number: expect.any(Feed),
        test_object: expect.any(Feed),
      })
    );
  });
  //----------------------------------------------------------------------------
  it('can pub Feed of any type with optional subscribers', () => {
    let target_a = '';
    let target_b = '';
    context.pub(
      'test_string',
      new Feed('a string'),
      (value) => {
        target_a = value;
      },
      (value) => {
        target_b = value + value;
      }
    );

    expect(context.subs).toStrictEqual([]);
    context.pins.test_string.push('test');

    expect(target_a).toBe('test');
    expect(target_b).toBe('testtest');
  });
  //----------------------------------------------------------------------------
  it('can sub a callback to a pin given a pin name', () => {
    let target = '';

    context.muster(element).sub('test', (value) => {
      target = value;
    });
    context.pins.test.push('test value');
    expect(target).toBe('test value');
  });
  //----------------------------------------------------------------------------
  it('throws when trying to sub to an invalid pin', () => {
    expect(() => {
      context.sub('invalidPin', (value) => {
        value = '';
      });
    }).toThrow();
  });
  //----------------------------------------------------------------------------
  it('can remove a pin given its name', () => {
    const pin_name = 'test_pin';
    context.pub(pin_name, new Feed('a string'));

    expect(context.pins[pin_name]).toEqual(expect.any(Feed));
    context.remove(pin_name);
    expect(context.pins[pin_name]).toBeUndefined();
    expect(() => {
      context.refresh();
    }).not.toThrow();
  });

  // it('can push to a pin given an existing pin name', () => {
  //   context.muster(element).push('test', )
  // });
  //----------------------------------------------------------------------------
  it('leaves no danglings subs after a remove', () => {
    let subscriber = jest.fn((v: string) => {});
    context.pub('test', new Feed('a string', RateLimit.none), subscriber);
    context.pins.test.push('first').push('second');
    expect(subscriber).toHaveBeenCalledTimes(2);

    const feed = context.pins.test;
    context.remove('test');
    feed.push('third');
    expect(subscriber).toHaveBeenCalledTimes(2);
  });
  //----------------------------------------------------------------------------
  it('can merge pins from another given context', () => {
    context.muster(element);

    const another_context = new Context()
      .pub('test_string', new Feed('a string'))
      .pub('test_number', new Feed(1980));

    context.merge(another_context);

    expect(context.pins).toEqual(
      expect.objectContaining({
        test_string: expect.any(Feed),
        test_number: expect.any(Feed),
        test: expect.any(Feed),
      })
    );
  });
  //----------------------------------------------------------------------------
  it('can merge pins from another given pin collection', () => {
    context.muster(element);

    const another_context = new Context()
      .pub('test_string', new Feed('a string'))
      .pub('test_number', new Feed(1980));

    context.merge(another_context.pins);

    expect(context.pins).toEqual(
      expect.objectContaining({
        test_string: expect.any(Feed),
        test_number: expect.any(Feed),
        test: expect.any(Feed),
      })
    );
  });
});
