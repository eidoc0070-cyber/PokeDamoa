
import { describe, it, expect, mock } from 'bun:test'; // vitest -> bun:test
const vi = { fn: mock };
import { Store } from '../src/state/store';

describe('Store', () => {
  it('should initialize with initial state', () => {
    const initialState = { count: 0 };
    const store = new Store(initialState);
    expect(store.getState()).toEqual(initialState);
  });

  it('should update state with setState', () => {
    const store = new Store({ count: 0, name: 'test' });
    store.setState({ count: 1 });
    expect(store.getState()).toEqual({ count: 1, name: 'test' });
  });

  it('should notify listeners when state changes', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    store.subscribe(listener);

    store.setState({ count: 1 });
    expect(listener).toHaveBeenCalledWith({ count: 1 });
    expect(listener).toHaveBeenCalledTimes(1);
  });

  it('should unsubscribe listeners', () => {
    const store = new Store({ count: 0 });
    const listener = vi.fn();
    const unsubscribe = store.subscribe(listener);

    unsubscribe();
    store.setState({ count: 1 });
    expect(listener).not.toHaveBeenCalled();
  });
});
