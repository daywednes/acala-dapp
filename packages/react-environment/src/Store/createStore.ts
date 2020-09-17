import { useState, Dispatch, SetStateAction } from 'react';

type Manipulations<T> = Record<string, (state: T, setState?: Dispatch<SetStateAction<T>>) => (...params: any[]) => any>;

export function createStore<T> (initializeStore: T, manipulations: Manipulations<T>) {
  return (): {
    state: T;
    setState: Dispatch<SetStateAction<T>>;
  } & { [k in keyof typeof manipulations]: ReturnType<(typeof manipulations)[k]> } => {
    const [state, setState] = useState<T>(initializeStore);
    const _m: { [k in keyof typeof manipulations]: ReturnType<(typeof manipulations)[k]> } = {};

    Object.keys(manipulations).forEach((key) => {
      _m[key] = manipulations[key](state, setState);
    });

    return {
      setState,
      state,
      ..._m
    } as {
      state: T;
      setState: Dispatch<SetStateAction<T>>;
    } & typeof _m;
  };
}
