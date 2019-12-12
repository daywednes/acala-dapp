import React, { useState, ReactEventHandler, ChangeEvent, ChangeEventHandler, useEffect } from 'react';
import {
    Dialog,
    DialogTitle,
    DialogContent,
    TextField,
    InputAdornment,
    Button,
    List,
    ListItem,
    ListItemText,
    makeStyles,
    createStyles,
    Box,
    Grid,
    IconButton,
} from '@material-ui/core';
import { useTranslate } from '@/hooks/i18n';
import { createTypography } from '@/theme';
import CloseIcon from '@/components/svgs/close';
import Formatter, { formatPrice } from '@/components/formatter';
import { getAssetName, getBalance } from '@/utils';
import { STABLE_COIN } from '@/config';
import { useDispatch, useSelector } from 'react-redux';
import actions from '@/store/actions';
import { statusSelector } from '@/store/vault/selectors';

export type ActionType = 'any' | 'payback' | 'generate' | 'deposit' | 'withdraw';

const useDialogStyles = makeStyles(() =>
    createStyles({
        paper: {
            width: 356,
            borderRadius: 0,
            padding: '50px 34px 38px',
        },
    }),
);

const useInputStyles = makeStyles(() =>
    createStyles({
        root: {
            width: '100%',
        },
        underline: {
            color: '#0123cc',
            background: '#0123cc',
            borderBottom: '#0123cc',
            '&::after': {
                borderBottom: '#0123cc',
            },
        },
    }),
);

const useTitleStyles = makeStyles(() =>
    createStyles({
        root: {
            padding: 0,
            ...createTypography(21, 22, 600, 'Roboto'),
        },
    }),
);

export interface ActionModalProps {
    current: number;
    open: boolean;
    action: ActionType;
    onClose?: () => void;
}

const ActionModal: React.FC<ActionModalProps> = ({ current, action, open, onClose }) => {
    const { t } = useTranslate();
    const dispatch = useDispatch();
    const dialogClasses = useDialogStyles();
    const titleClasses = useTitleStyles();
    const inputClasses = useInputStyles();
    const updateVaultStatus = useSelector(statusSelector('updateVault'));
    const stableCoinAssetName = getAssetName(STABLE_COIN);
    const currentAssetName = getAssetName(current);
    const [amount, setAmount] = useState<number>(0);

    const getTitle = (action: ActionType): string => {
        if (action === 'payback') {
            return t('Payback {{asset}}', { asset: stableCoinAssetName });
        }
        if (action === 'generate') {
            return t('Generate {{asset}}', { asset: stableCoinAssetName });
        }
        if (action === 'deposit') {
            return t('Disposit {{asset}}', { asset: currentAssetName });
        }
        if (action === 'withdraw') {
            return t('Withdraw {{asset}}', { asset: currentAssetName });
        }
        return '';
    };

    const renderApplyBtnText = (action: ActionType): string => {
        if (action === 'payback') return t('Payback');
        if (action === 'generate') return t('Generate');
        if (action === 'deposit') return t('Deposit');
        if (action === 'withdraw') return t('Withdraw');
        return '';
    };

    const handleInput: ChangeEventHandler<HTMLInputElement> = e => {
        const value = Number(e.currentTarget.value);
        setAmount(value);
    };

    useEffect(() => {
        if (updateVaultStatus === 'success') {
            dispatch(actions.vault.reset());
            onClose && onClose();
        }
    }, [updateVaultStatus]);

    const handleApplyBtnClick: ReactEventHandler<HTMLButtonElement> = () => {
        if (action === 'payback') {
            dispatch(
                actions.vault.updateVault.request({
                    asset: current,
                    collateral: 0,
                    debit: getBalance(-amount),
                }),
            );
        }
        if (action === 'generate') {
            dispatch(
                actions.vault.updateVault.request({
                    asset: current,
                    collateral: 0,
                    debit: getBalance(amount),
                }),
            );
        }
        if (action === 'withdraw') {
            dispatch(
                actions.vault.updateVault.request({
                    asset: current,
                    collateral: getBalance(-amount),
                    debit: 0,
                }),
            );
        }
        if (action === 'deposit') {
            dispatch(
                actions.vault.updateVault.request({
                    asset: current,
                    collateral: getBalance(amount),
                    debit: 0,
                }),
            );
        }
    };

    return (
        <Dialog open={open} onClose={onClose} classes={dialogClasses}>
            <DialogTitle classes={titleClasses} disableTypography>
                <Grid container justify="space-between" alignItems="center">
                    <p>{getTitle(action)}</p>
                    <IconButton onClick={onClose}>
                        <CloseIcon />
                    </IconButton>
                </Grid>
            </DialogTitle>
            <DialogContent>
                <TextField
                    type="number"
                    classes={{ root: inputClasses.root }}
                    inputProps={{ classes: inputClasses }}
                    InputProps={{
                        value: amount,
                        onChange: handleInput,
                        startAdornment: <InputAdornment position="start">$</InputAdornment>,
                    }}
                />
                <Box paddingTop={4} />
                <Grid container justify="space-between">
                    <Button variant="contained" color="primary" onClick={handleApplyBtnClick}>
                        {renderApplyBtnText(action)}
                    </Button>
                    <Button variant="contained" color="secondary" onClick={onClose}>
                        {t('cancel')}
                    </Button>
                </Grid>
                <Box paddingTop={6} />
                <List disablePadding>
                    <ListItem disableGutters>
                        <ListItemText
                            primary={t('Borrowed aUSD')}
                            secondary={t('{{number}} {{asset}}', { number: 240, asset: 'aUSD' })}
                        />
                    </ListItem>
                    <ListItem disableGutters>
                        <ListItemText
                            primary={t('aUSD Balance')}
                            secondary={t('{{number}} {{asset}}', { number: 899.44, asset: 'aUSD' })}
                        />
                    </ListItem>
                    <ListItem disableGutters>
                        <ListItemText
                            primary={t('New Liquidation Ratio')}
                            secondary={t('{{number}} {{asset}}', {
                                number: formatPrice(899.44, '$'),
                                asset: 'ETH/aUSD',
                            })}
                        />
                    </ListItem>
                    <ListItem disableGutters>
                        <ListItemText
                            primary={t('New Liquidation Price')}
                            secondary={<Formatter data={2.5944} type="ratio" suffix="%" />}
                        />
                    </ListItem>
                </List>
            </DialogContent>
        </Dialog>
    );
};

export default ActionModal;
