import { Observable, combineLatest, Subscription, interval } from 'rxjs';
import { map, shareReplay, startWith, mergeMap } from 'rxjs/operators';
import { ApiRx } from '@polkadot/api';

import { DerivedDexPool } from '@acala-network/api-derive';
import { convertToFixed18, Fixed18 } from '@acala-network/app-util';
import { CurrencyId, OracleKey } from '@acala-network/types/interfaces';
import { TimestampedValue } from '@open-web3/orml-types/interfaces';

import { tokenEq, getValueFromTimestampValue } from '@acala-dapp/react-components';

import { BaseRxStore } from './base';
import { PriceData, StakingPoolWithHelper } from './type';

type SubscribeCallbackFN = (result: PriceData[]) => void;

export class PriceStore extends BaseRxStore {
  private data$!: Observable<PriceData[]>;
  private stakingPool$!: Observable<StakingPoolWithHelper>;
  private api!: ApiRx;

  run (): void {
    const nativeCurrency = this.api.consts.currencies.nativeCurrencyId as unknown as CurrencyId;
    const allPrices$ = interval(1000 * 60).pipe(startWith(0), mergeMap(() => (this.api.rpc as any).oracle.getAllValues('Aggregated'))) as Observable<[[OracleKey, TimestampedValue]]>;
    const dex$ = (this.api.derive as any).dex.pool(nativeCurrency) as Observable<DerivedDexPool>;

    this.data$ = combineLatest([allPrices$, this.stakingPool$, dex$]).pipe(
      map(([prices, pool, nativeCurrencyDex]): PriceData[] => {
        const exchangeRate = pool.helper.liquidExchangeRate;

        const result = prices.map((item) => ({
          currency: item[0].toString(),
          price: convertToFixed18(getValueFromTimestampValue(item[1]))
        }));

        const stakingCurrencyPrice = result.find((item) =>
          tokenEq(item.currency, pool.stakingPool.stakingCurrency)
        );

        // calculate native currency price
        if (nativeCurrencyDex) {
          const price = convertToFixed18(nativeCurrencyDex.base).div(convertToFixed18(nativeCurrencyDex.other));
          const _p = result.find((item: PriceData): boolean => tokenEq(item.currency, nativeCurrency));

          if (_p) {
            _p.price = price;
          } else {
            result.push({ currency: nativeCurrency.toString(), price });
          }
        }

        // calculate and update liuquid currency price
        if (stakingCurrencyPrice && pool.stakingPool) {
          const currency = pool.stakingPool.liquidCurrency;
          const price = stakingCurrencyPrice.price
            .mul(exchangeRate)
            .max(Fixed18.ZERO);
          const _p = result.find((item: PriceData): boolean => tokenEq(item.currency, currency));

          if (_p) {
            _p.price = price;
          } else {
            result.push({ currency: currency.toString(), price });
          }
        }

        result.push({ currency: 'AUSD', price: Fixed18.fromNatural(1) });

        return result;
      }),
      shareReplay(1)
    );
  }

  init (api: ApiRx, stakingPool$: Observable<StakingPoolWithHelper>): void {
    this.stakingPool$ = stakingPool$;
    this.api = api;
    this.run();
  }

  subscribe (callback: SubscribeCallbackFN): Subscription {
    return this.data$.subscribe(callback);
  }
}
