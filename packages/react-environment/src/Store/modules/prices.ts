import { Fixed18 } from '@acala-network/app-util';
import { ApiRx } from '@polkadot/api';

import { CurrencyLike } from '@acala-dapp/react-hooks/types';

import { createStore } from '../createStore';

export const usePricesStore = createStore<Record<string, Fixed18>>({}, {
  getPrice: (state) => (currency: CurrencyLike): Fixed18 => {
    return state[currency.toString()] || Fixed18.ZERO;
  }
});

export const subscribePrice = (api: ApiRx, callback: (result: Record<string, Fixed18>) => void): void => {
  const oracleKeys = api.registry.createType('OracleKey' as any);

  api.query.acalaOracle.values.multi(oracleKeys.defKeys).subscribe((result) => {
    result.map((item) => {
    });
  });
};
