import { useState, useEffect } from 'react';
import AccountId from '@polkadot/types/generic/AccountId';
import { convertToFixed18, Fixed18 } from '@acala-network/app-util';
import { Balance } from '@polkadot/types/interfaces';
import { PoolInfo, Share } from '@open-web3/orml-types/interfaces';

import { useCall } from './useCall';
import { useAccounts } from './useAccounts';
import { useConstants } from './useConstants';
import { CurrencyLike } from './types';

interface DexRewardData {
  amount: Fixed18;
  token: CurrencyLike;
  rewardRatio: Fixed18;
}

export const useDexReward = (currency: CurrencyLike, account?: AccountId | string): DexRewardData => {
  const { active } = useAccounts();
  const _account = account || (active ? active.address : '');

  const rewardsPoolInfo = useCall<PoolInfo>('query.rewards.pools', [{ DexSaving: currency }]);
  const shareAndWithdrawnReward = useCall<[Share, Balance]>('query.rewards.shareAndWithdrawnReward', [{ DexSaving: currency }, _account]);
  const dexSavingRates = useCall<Balance>('query.incentives.dEXSavingRates', [currency]);
  const { dexBaseCurrency } = useConstants();

  const [amount, setAmount] = useState<Fixed18>(Fixed18.ZERO);

  useEffect(() => {
    if (!rewardsPoolInfo) return;
    if (!shareAndWithdrawnReward) return;

    const totalRewards = convertToFixed18(rewardsPoolInfo.totalRewards);
    const withdrawnReward = convertToFixed18(shareAndWithdrawnReward[1]);
    const shares = convertToFixed18(shareAndWithdrawnReward[0]);
    const totalShares = convertToFixed18(rewardsPoolInfo.totalShares);

    setAmount(
      shares.div(totalShares).mul(totalRewards).sub(withdrawnReward)
    );
  }, [setAmount, rewardsPoolInfo, shareAndWithdrawnReward]);

  return {
    amount,
    rewardRatio: convertToFixed18(dexSavingRates || 0).div(Fixed18.fromNatural(2)),
    token: dexBaseCurrency
  };
};
