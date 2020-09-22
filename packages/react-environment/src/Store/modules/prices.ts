import { ApiRx } from '@polkadot/api';
import { interval, Observable, combineLatest } from 'rxjs'
import { startWith, mergeMap } from 'rxjs/operators'

import { TimestampedValue } from '@open-web3/orml-types/interfaces';
import { Fixed18 } from '@acala-network/app-util';
import { CurrencyId, OracleKey } from '@acala-network/types/interfaces';
import { CurrencyLike } from '@acala-dapp/react-hooks/types';

import { createStore } from '../createStore';

export const usePricesStore = createStore<Record<string, Fixed18>>({}, {
  getPrice: (state) => (currency: CurrencyLike): Fixed18 => {
    return state[currency.toString()] || Fixed18.ZERO;
  }
});

export const subscribePrice = (api: ApiRx, callback: (result: Record<string, Fixed18>) => void): void => {
  const nativeCurrency = api.consts.currencies.nativeCurrencyId as unknown as CurrencyId;

  // get oracle feed value from chain
  const oracleFeeds$ = interval(1000 * 60)
    .pipe(
      startWith(0),
      mergeMap(
        () => (api.rpc as any).oracle.getAllValues('Aggregated') as Observable<[OracleKey, TimestampedValue][]>
      ));
};
