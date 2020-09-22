import React, { memo, createContext, FC, PropsWithChildren, useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { Observable, combineLatest, Subscription } from 'rxjs';
import { map, first } from 'rxjs/operators';

import { Vec } from '@polkadot/types';
import { CurrencyId } from '@acala-network/types/interfaces';
import { Fixed18, calcTargetInOtherToBase, convertToFixed18, calcTargetInBaseToOther, calcTargetInOtherToOther, calcSupplyInOtherToBase, calcSupplyInBaseToOther, calcSupplyInOtherToOther } from '@acala-network/app-util';
import { DerivedDexPool } from '@acala-network/api-derive';

import { useApi, useConstants, useInitialize } from '@acala-dapp/react-hooks';
import { tokenEq } from '@acala-dapp/react-components';
import { PageLoading } from '@acala-dapp/ui-components';

export interface PoolData {
  supplyCurrency: CurrencyId;
  targetCurrency: CurrencyId;
  supplySize: number;
  targetSize: number;
}

interface ContextData {
  dexBaseCurrency: CurrencyId;

  supplyCurrencies: (CurrencyId | string)[];
  targetCurrencies: (CurrencyId | string)[];

  calcSupply: (supplyCurrency: CurrencyId, targetCurrency: CurrencyId, target: number | string, slippage?: number | string) => Observable<number | string>;
  calcTarget: (supplyCurrency: CurrencyId, targetCurrency: CurrencyId, supply: number | string, slippage?: number | string) => Observable<number | string>;

  setCurrency: (target: CurrencyId, other: CurrencyId, callback?: (pool: PoolData) => void) => void;
  pool: PoolData;

  slippage: number;
  setSlippage: (value: number) => void;

  priceImpact: number;
  setPriceImpact: (value: number) => void;

  isInitialized: boolean;
}

const convertPool = (origin: DerivedDexPool): { base: Fixed18; other: Fixed18 } => {
  return {
    base: convertToFixed18(origin.base),
    other: convertToFixed18(origin.other)
  };
};

export const SwapContext = createContext<ContextData>({} as ContextData);

export const SwapProvider: FC<PropsWithChildren<{}>> = memo(({ children }) => {
  const { api } = useApi();
  const { isInitialized, setEnd } = useInitialize();
  const { dexBaseCurrency } = useConstants();
  const subscriptionRef = useRef<Subscription>();

  const supplyCurrencies = useMemo(() => {
    const result = (api.consts.dex.enabledCurrencyIds as Vec<CurrencyId>).toArray();

    result.push(dexBaseCurrency);

    return result;
  }, [api.consts.dex.enabledCurrencyIds, dexBaseCurrency]);

  const targetCurrencies = useMemo(() => supplyCurrencies.slice(), [supplyCurrencies]);

  const defaultSupplyCurrency = useMemo(() => supplyCurrencies[0], [supplyCurrencies]);

  const feeRate = useMemo(() => api.consts.dex.getExchangeFee, [api]);

  const [slippage, setSlippage] = useState<number>(0.005);
  const [priceImpact, setPriceImpact] = useState<number>(0);

  const [pool, setPool] = useState<PoolData>({
    supplyCurrency: '' as any as CurrencyId,
    supplySize: 0,
    targetCurrency: '' as any as CurrencyId,
    targetSize: 0
  });

  const setCurrency = useCallback((supply: CurrencyId, target: CurrencyId): void => {
    if (subscriptionRef.current) {
      subscriptionRef.current.unsubscribe();
    }

    // base to other
    if (tokenEq(supply, dexBaseCurrency) && !tokenEq(target, dexBaseCurrency)) {
      subscriptionRef.current = ((api.derive as any).dex.pool(target) as Observable<DerivedDexPool>).subscribe((pool) => {
        setPool({
          supplyCurrency: supply,
          supplySize: convertToFixed18(pool.base).toNumber(),
          targetCurrency: target,
          targetSize: convertToFixed18(pool.other).toNumber()
        });
      });
    }

    // other to base
    if (tokenEq(target, dexBaseCurrency) && !tokenEq(supply, dexBaseCurrency)) {
      subscriptionRef.current = ((api.derive as any).dex.pool(supply) as Observable<DerivedDexPool>).subscribe((pool) => {
        setPool({
          supplyCurrency: supply,
          supplySize: convertToFixed18(pool.other).toNumber(),
          targetCurrency: target,
          targetSize: convertToFixed18(pool.base).toNumber()
        });
      });
    }

    // other to other
    if (!tokenEq(target, dexBaseCurrency) && !tokenEq(supply, dexBaseCurrency)) {
      subscriptionRef.current = combineLatest([
        (api.derive as any).dex.pool(supply) as Observable<DerivedDexPool>,
        (api.derive as any).dex.pool(target) as Observable<DerivedDexPool>
      ]).subscribe(([supplyPool, targetPool]) => {
        setPool({
          supplyCurrency: supply,
          supplySize: convertToFixed18(supplyPool.other).toNumber(),
          targetCurrency: target,
          targetSize: convertToFixed18(targetPool.other).toNumber()
        });
      });
    }

    if (tokenEq(supply, dexBaseCurrency) && tokenEq(target, dexBaseCurrency)) {
      setPool({
        supplyCurrency: supply,
        supplySize: 0,
        targetCurrency: target,
        targetSize: 0
      });
    }
  }, [api.derive, dexBaseCurrency, setPool]);

  const calcSupply = useCallback((supplyCurrency: CurrencyId, targetCurrency: CurrencyId, target: number | string, slippage?: number | string): Observable<number | string> => {
    // reload supply pool and target pool
    return combineLatest([
      (api.derive as any).dex.pool(supplyCurrency) as Observable<DerivedDexPool>,
      (api.derive as any).dex.pool(targetCurrency) as Observable<DerivedDexPool>
    ]).pipe(
      map(([supplyPool, targetPool]) => {
        if (!supplyPool || !targetPool) return 0;

        if (!supplyCurrency.eq(dexBaseCurrency) && targetCurrency.eq(dexBaseCurrency)) {
          // other to base
          return calcSupplyInOtherToBase(
            Fixed18.fromNatural(target),
            convertPool(supplyPool),
            convertToFixed18(feeRate),
            Fixed18.fromNatural(slippage || 0)
          ).toString(18, 3);
        } else if (supplyCurrency.eq(dexBaseCurrency) && !targetCurrency.eq(dexBaseCurrency)) {
          return calcSupplyInBaseToOther(
            Fixed18.fromNatural(target),
            convertPool(targetPool),
            convertToFixed18(feeRate),
            Fixed18.fromNatural(slippage || 0)
          ).toString(18, 3);
        } else if (!supplyCurrency.eq(dexBaseCurrency) && !targetCurrency.eq(dexBaseCurrency)) {
          // other to other
          return calcSupplyInOtherToOther(
            Fixed18.fromNatural(target),
            convertPool(supplyPool),
            convertPool(targetPool),
            convertToFixed18(feeRate),
            Fixed18.fromNatural(slippage || 0)
          ).toString(18, 3);
        }

        return 0;
      }),
      first()
    );
  }, [api.derive, dexBaseCurrency, feeRate]);

  const calcTarget = useCallback((supplyCurrency: CurrencyId, targetCurrency: CurrencyId, supply: number | string, slippage?: number | string): Observable<number | string> => {
    // reload supply pool and target pool
    return combineLatest([
      (api.derive as any).dex.pool(supplyCurrency) as Observable<DerivedDexPool>,
      (api.derive as any).dex.pool(targetCurrency) as Observable<DerivedDexPool>
    ]).pipe(
      map(([supplyPool, targetPool]) => {
        if (!supplyPool || !targetPool) return 0;

        if (!supplyCurrency.eq(dexBaseCurrency) && targetCurrency.eq(dexBaseCurrency)) {
          // other to base
          return calcTargetInOtherToBase(
            Fixed18.fromNatural(supply),
            convertPool(supplyPool),
            convertToFixed18(feeRate),
            Fixed18.fromNatural(slippage || 0)
          ).toString(18, 3);
        } else if (supplyCurrency.eq(dexBaseCurrency) && !targetCurrency.eq(dexBaseCurrency)) {
          return calcTargetInBaseToOther(
            Fixed18.fromNatural(supply),
            convertPool(targetPool),
            convertToFixed18(feeRate),
            Fixed18.fromNatural(slippage || 0)
          ).toString(18, 3);
        } else if (!supplyCurrency.eq(dexBaseCurrency) && !targetCurrency.eq(dexBaseCurrency)) {
          // other to other
          return calcTargetInOtherToOther(
            Fixed18.fromNatural(supply),
            convertPool(supplyPool),
            convertPool(targetPool),
            convertToFixed18(feeRate),
            Fixed18.fromNatural(slippage || 0)
          ).toString(18, 3);
        }

        return 0;
      }),
      first()
    );
  }, [api.derive, dexBaseCurrency, feeRate]);

  useEffect(() => {
    if (pool.supplyCurrency && !isInitialized) {
      setEnd();
    }
  }, [isInitialized, pool, setEnd]);

  useEffect(() => {
    setCurrency(defaultSupplyCurrency, dexBaseCurrency);
  }, [defaultSupplyCurrency, dexBaseCurrency, setCurrency]);

  return (
    <SwapContext.Provider value={{
      calcSupply,
      calcTarget,
      dexBaseCurrency,
      isInitialized,
      pool,
      priceImpact,
      setCurrency,
      setPriceImpact,
      setSlippage,
      slippage,
      supplyCurrencies,
      targetCurrencies
    }}>
      {
        isInitialized ? children : <PageLoading />
      }
    </SwapContext.Provider>
  );
});

SwapProvider.displayName = 'SwapProvider';
