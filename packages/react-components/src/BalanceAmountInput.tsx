import React, { FC, useState, useMemo, FocusEventHandler, useCallback, useEffect } from 'react';
import clsx from 'clsx';
import { useFormik } from 'formik';
import { noop } from 'lodash';

import { Fixed18, convertToFixed18 } from '@acala-network/app-util';

import { CurrencyLike } from '@acala-dapp/react-hooks/types';
import { usePrice, useBalance, useConstants, useFormValidator } from '@acala-dapp/react-hooks';
import { SwitchIcon, Condition } from '@acala-dapp/ui-components';

import classes from './BalanceAmountInput.module.scss';
import { BalanceInput } from './BalanceInput';
import { TokenName } from './Token';
import { FormatValue } from './format';

type InputType = 'balance' | 'amount';

export interface BalanceAmountInputProps {
  currency: CurrencyLike;
  onBalanceChange: (number: number) => void;
  onError: (error: boolean) => void;
  onCurrencyChange: (currency: CurrencyLike) => void;
}

export const BalanceAmountInput: FC<BalanceAmountInputProps> = ({
  currency,
  onBalanceChange,
  onCurrencyChange,
  onError
}) => {
  const price = usePrice(currency);
  const balance = useBalance(currency);
  const { stableCurrency } = useConstants();
  const [inputType, setInputType] = useState<InputType>('balance');
  const [focused, setFocused] = useState<boolean>(false);

  const maxAmount = useMemo(() => {
    if (!balance || !price) return 0;

    return convertToFixed18(balance).mul(price).toNumber();
  }, [balance, price]);

  const validator = useFormValidator({
    amount: {
      max: maxAmount,
      type: 'number'
    },
    balance: {
      currency: currency,
      type: 'balance'
    }
  });

  const form = useFormik({
    initialValues: {
      amount: '' as any as number,
      balance: '' as any as number
    },
    onSubmit: noop,
    validate: validator
  });

  const displayAmount = useMemo(() => {
    if (!price) return Fixed18.ZERO;

    return Fixed18.fromNatural(form.values.balance || 0).mul(price);
  }, [price, form.values]);

  const displayBalance = useMemo(() => {
    if (!price) return Fixed18.ZERO;

    const amount = Fixed18.fromNatural(form.values.amount || 0).div(price);

    return amount;
  }, [price, form.values]);

  const handleCurrencyChange = useCallback((currency: CurrencyLike): void => {
    form.resetForm();
    onCurrencyChange(currency);
  }, [onCurrencyChange, form]);

  const handleSwitch = useCallback(() => {
    setInputType(inputType === 'amount' ? 'balance' : 'amount');
    form.resetForm();
  }, [setInputType, inputType, form]);

  const handleFocus: FocusEventHandler<HTMLInputElement> = () => {
    setFocused(true);
  };

  const hanleBlur: FocusEventHandler<HTMLInputElement> = () => {
    setFocused(false);
  };

  const handleBalanceMax = useCallback(() => {
    if (!balance) return;

    form.setFieldValue('balance', convertToFixed18(balance).toString(18, 3));
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [balance]);

  const handleAmountMax = useCallback(() => {
    form.setFieldValue('amount', maxAmount || 0);
  /* eslint-disable-next-line react-hooks/exhaustive-deps */
  }, [maxAmount]);

  const handleAmountChange = useCallback((value: number) => {
    form.setFieldValue('amount', value);
  }, [form]);

  const handleBalanceChange = useCallback((value: number) => {
    form.setFieldValue('balance', value);
  }, [form]);

  const error = useMemo(() => {
    if (inputType === 'amount') {
      return form.errors.amount;
    }

    if (inputType === 'balance') {
      return form.errors.balance;
    }

    return true;
  }, [form, inputType]);

  const rootClasses = useMemo(() => {
    return clsx(classes.root, {
      [classes.focused]: focused,
      [classes.error]: !!error
    });
  }, [focused, error]);

  useEffect(() => {
    onError(!!error);
  }, [onError, error]);

  useEffect(() => {
    if (!price) return;

    if (inputType === 'balance') {
      onBalanceChange(form.values.balance);
    }

    if (inputType === 'amount') {
      onBalanceChange(Fixed18.fromNatural(form.values.amount).div(price).toNumber());
    }
  }, [form.values, inputType, price, onBalanceChange]);

  return (
    <div className={rootClasses}>
      <div className={classes.switch}
        onClick={handleSwitch}
      >
        <SwitchIcon />
      </div>
      <div className={classes.inputArea}>
        <Condition condition={inputType === 'balance'}>
          <BalanceInput
            border={false}
            className={classes.balanceInput}
            enableTokenSelect
            error={form.errors.balance}
            id='balance'
            name='balance'
            onBlur={hanleBlur}
            onChange={handleBalanceChange}
            onFocus={handleFocus}
            onMax={handleBalanceMax}
            onTokenChange={handleCurrencyChange}
            showIcon={false}
            showMaxBtn
            size='small'
            token={currency}
            value={form.values.balance}
          />
          <div className={classes.amountDisplay}>
            <FormatValue data={displayAmount} />
            <TokenName currency={stableCurrency} />
          </div>
        </Condition>
        <Condition condition={inputType === 'amount'}>
          <BalanceInput
            border={false}
            className={classes.balanceInput}
            error={form.errors.amount}
            id='amount'
            name='amount'
            onChange={handleAmountChange}
            onMax={handleAmountMax}
            showIcon={false}
            showMaxBtn
            size='small'
            token={stableCurrency}
            value={form.values.amount}
          />
          <BalanceInput
            border={false}
            className={classes.balanceDisplay}
            disabled
            enableTokenSelect
            onTokenChange={handleCurrencyChange}
            showIcon={false}
            token={currency}
            value={displayBalance.toNumber()}
          />
        </Condition>
      </div>
    </div>
  );
};
