import { useEffect, useState, useCallback, useRef } from 'react';
import { combineLatest, Observable, Subscription } from 'rxjs';
import { map } from 'rxjs/operators';

import { PoolInfo, Share } from '@open-web3/orml-types/interfaces';
import { convertToFixed18, Fixed18 } from '@acala-network/app-util';
import { DerivedDexPool } from '@acala-network/api-derive';

import { tokenEq } from '@acala-dapp/react-components';

import { useApi } from './useApi';
import { useAccounts } from './useAccounts';
import { useConstants } from './useConstants';
import { useAllPrices } from './priceHooks';
import { CurrencyLike } from './types';

const calcAccumulateResult = (rewards: Fixed18[], callback: (result: Fixed18) => void): void => {
  const total = rewards.reduce((acc, cur) => {
    return acc.add(cur);
  }, Fixed18.ZERO);

  callback(total);
};

interface HooksReturnType {
  amount: Fixed18;
  token: CurrencyLike;
}

/**
 * @description get active user total reward from dex
 */
export const useDexTotalUserReward = (): HooksReturnType => {
  const { api } = useApi();
  const { active } = useAccounts();
  const { dexCurrencies, stableCurrency } = useConstants();
  const [totalReward, setTotalReward] = useState<Fixed18>(Fixed18.ZERO);

  const run = useCallback((): Subscription | undefined => {
    if (!active || !api) return;

    const getReward$ = (currency: CurrencyId): Observable<Fixed18> => {
      return combineLatest([
        api.query.rewards.pools<PoolInfo>({ DexSaving: currency } as any),
        api.query.rewards.shareAndWithdrawnReward<[Share, Balance]>({ DexSaving: currency } as any, active.address)
      ]).pipe(
        map(([poolInfo, [_shares, _withdrawnReward]]) => {
          const totalInterest = convertToFixed18(poolInfo.totalRewards);
          const withdrawnReward = convertToFixed18(_withdrawnReward);
          const shares = convertToFixed18(_shares);
          const totalShares = convertToFixed18(poolInfo.totalShares);

          if (totalShares.isZero()) return Fixed18.ZERO;

          return totalInterest.mul(shares.div(totalShares)).sub(withdrawnReward);
        })
      );
    };

    return combineLatest(dexCurrencies.map(getReward$))
      .subscribe((result: Fixed18[]) => {
        calcAccumulateResult(result, setTotalReward);
      });
  }, [active, api, dexCurrencies]);

  useEffect(() => {
    const subscriber = run();

    return (): void => subscriber ? subscriber.unsubscribe() : undefined;
  }, [api, active, run]);

  return {
    amount: totalReward,
    token: stableCurrency
  };
};

/**
 * @description get all system reward from dex
 */
export const useDexTotalSystemReward = (): HooksReturnType => {
  const { api } = useApi();
  const { dexCurrencies, stableCurrency } = useConstants();
  const [totalReward, setTotalReward] = useState<Fixed18>(Fixed18.ZERO);

  const run = useCallback((): Subscription | undefined => {
    if (!api) return;

    const getReward$ = (currency: CurrencyId): Observable<Fixed18> => {
      return api.query.rewards.pools<PoolInfo>({ DexSaving: currency } as any).pipe(
        map((poolInfo) => {
          const totalInterest = convertToFixed18(poolInfo.totalRewards);
          const withdrawnInterest = convertToFixed18(poolInfo.totalWithdrawnRewards);

          return totalInterest.sub(withdrawnInterest);
        })
      );
    };

    return combineLatest(dexCurrencies.map(getReward$))
      .subscribe((result: Fixed18[]) => {
        calcAccumulateResult(result, setTotalReward);
      });
  }, [api, dexCurrencies, setTotalReward]);

  useEffect(() => {
    const subscriber = run();

    return (): void => subscriber ? subscriber.unsubscribe() : undefined;
  }, [api, run]);

  return {
    amount: totalReward,
    token: stableCurrency
  };
};

interface HooksReturnType {
  amount: Fixed18;
  token: CurrencyLike;
}

export const useDexTotalUserDeposit = (): HooksReturnType => {
  const { api } = useApi();
  const { active } = useAccounts();
  const { dexCurrencies, stableCurrency } = useConstants();
  const subscriber = useRef<Subscription>();
  const prices = useAllPrices();
  const [totalDeposit, setTotalDeposit] = useState<Fixed18>(Fixed18.ZERO);

  const run = useCallback(() => {
    if (!api || !active || !prices) return;

    const getDeposit$ = (currency: CurrencyId): Observable<Fixed18> => {
      const price = prices.find((item) => tokenEq(item.currency, currency));

      return combineLatest([
        (api.derive as any).dex.pool(currency) as Observable<DerivedDexPool>,
        api.query.dex.shares<Balance>(currency as any, active.address),
        api.query.dex.totalShares<Balance>(currency as any)
      ]).pipe(
        map(([pool, _shares, _totalShares]) => {
          const base = convertToFixed18(pool.base);
          const other = convertToFixed18(pool.other);
          const share = convertToFixed18(_shares);
          const totalShares = convertToFixed18(_totalShares);
          const ratio = share.div(totalShares);

          if (!ratio.isFinity()) return Fixed18.ZERO;

          return price ? base.mul(ratio).add(other.mul(ratio).mul(price.price)) : Fixed18.ZERO;
        })
      );
    };

    subscriber.current = combineLatest(dexCurrencies.map(getDeposit$))
      .subscribe((result: Fixed18[]) => {
        calcAccumulateResult(result, setTotalDeposit);
      });
  }, [api, active, prices, dexCurrencies]);

  useEffect(() => {
    run();

    return (): void => subscriber.current ? subscriber.current.unsubscribe() : undefined;
  }, [run]);

  return {
    amount: totalDeposit,
    token: stableCurrency
  };
};
