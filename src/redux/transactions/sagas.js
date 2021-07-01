import { all, takeEvery, put, select, call, take } from 'redux-saga/effects'
import Cardano from 'services/cardano'
import BigNumber from 'bignumber.js'
import actions from './actions'
import { FETCH_NETWORK_STATE } from '../wallets/sagas'

export function* CHANGE_SETTING({ payload: { setting, value } }) {
  yield put({
    type: 'transactions/SET_STATE',
    payload: {
      [setting]: value,
    },
  })
}

export function* BUILD_TX({ payload }) {
  const { value, toAddress, type, poolId } = payload

  if (type) {
    yield put({
      type: 'transactions/SET_STATE',
      payload: {
        transactionLoading: true,
      },
    })
    yield call(FETCH_NETWORK_STATE)
    yield take(FETCH_NETWORK_STATE)
  }

  const [changeAddress] = yield select((state) => state.wallets.walletAddresses)
  const networkInfo = yield select((state) => state.wallets.networkInfo)
  const hasStakingKey = yield select((state) => state.wallets.walletStake.hasStakingKey)
  const rewardsAmount = yield select((state) => state.wallets.walletStake.rewardsAmount)
  const rewardAddress = yield select((state) => state.wallets.walletParams.rewardAddress)
  const walletUTXOs = yield select((state) => state.wallets.walletUTXOs)
  const publicKey = yield select((state) => state.wallets.walletParams.publicKey)
  const currentSlot = networkInfo.tip?.slotNo

  const computedValue = value ? new BigNumber(value).multipliedBy(1000000).toFixed() : undefined
  let metadata
  const certificates = []
  const withdrawals = []

  if (type === 'delegate') {
    const certs = yield call(
      Cardano.crypto.generateDelegationCerts,
      publicKey,
      hasStakingKey,
      poolId,
    )
    certificates.push(...certs)
  }

  if (type === 'withdraw') {
    withdrawals.push({
      address: rewardAddress,
      amount: rewardsAmount,
    })
  }

  const response = yield call(
    Cardano.crypto.txBuild,
    type,
    computedValue,
    toAddress,
    changeAddress,
    currentSlot,
    walletUTXOs,
    metadata,
    certificates,
    withdrawals,
  )

  yield put({
    type: 'transactions/SET_STATE',
    payload: {
      transaction: response,
    },
  })

  if (type) {
    yield put({
      type: 'transactions/SET_STATE',
      payload: {
        transactionType: type,
      },
    })
  }

  yield put({
    type: 'transactions/SET_STATE',
    payload: {
      transactionLoading: false,
    },
  })
}

export function* SEND_TX({ payload }) {
  yield put({
    type: 'transactions/SET_STATE',
    payload: {
      transactionWaiting: true,
    },
  })

  const { transaction, privateKey } = payload
  const signedTx = yield call(Cardano.crypto.txSign, transaction, privateKey)
  const { data: sendTx } = yield call(Cardano.explorer.txSend, signedTx)
  if (sendTx) {
    const transactionHash = sendTx?.submitTransaction?.hash
    yield put({
      type: 'transactions/SET_STATE',
      payload: {
        transactionWaitingHash: transactionHash,
      },
    })
  }

  yield put({
    type: 'transactions/SET_STATE',
    payload: {
      transactionWaiting: false,
    },
  })
}

export function* CHECK_TX({ payload }) {
  const { hash } = payload
  const { data: success } = yield call(Cardano.explorer.getTransactionsIO, [hash])
  if (success?.transactions?.length) {
    yield put({
      type: 'transactions/SET_STATE',
      payload: {
        transactionSuccess: true,
      },
    })
  }
}

export function* CLEAR_TX() {
  yield put({
    type: 'transactions/SET_STATE',
    payload: {
      transactionLoading: false,
      transactionType: '',
      transaction: {},
      transactionWaitingHash: '',
      transactionSuccess: false,
    },
  })
}

export default function* rootSaga() {
  yield all([takeEvery(actions.CHANGE_SETTING, CHANGE_SETTING)])
  yield all([takeEvery(actions.BUILD_TX, BUILD_TX)])
  yield all([takeEvery(actions.SEND_TX, SEND_TX)])
  yield all([takeEvery(actions.CLEAR_TX, CLEAR_TX)])
  yield all([takeEvery(actions.CHECK_TX, CHECK_TX)])
}
