import { useState } from 'react';
import { useArenaSDK } from './useArenaSDK';
import { CONTRACT_ADDRESSES } from '@/utils/constants';
import { AMMRouterABI } from '@/contracts/AMMRouterABI';
import { ERC20ABI } from '@/contracts/ERC20ABI';

interface LiquidityState {
  step: 'idle' | 'approving' | 'adding' | 'removing' | 'success' | 'error';
  isLoading: boolean;
  txHash?: string;
  error?: string;
}

export const useLiquidity = (onTransactionSuccess?: () => void) => {
  const [state, setState] = useState<LiquidityState>({
    step: 'idle',
    isLoading: false
  });

  const arenaData = useArenaSDK();

  // Reset state
  const reset = () => {
    setState({
      step: 'idle',
      isLoading: false
    });
  };

  // Check ORDER allowance for AMM Router
  const checkAllowance = async (amount: string) => {
    if (!arenaData?.sdk?.provider || !arenaData.address) {
      throw new Error('Arena wallet not connected');
    }

    try {
      const amountWei = BigInt(parseFloat(amount) * 1e18);
      
      // Check current allowance
      const allowanceData = '0xdd62ed3e' + 
        arenaData.address.slice(2).padStart(64, '0') +
        CONTRACT_ADDRESSES.liquidity.AMM_ROUTER.slice(2).padStart(64, '0');

      const result = await arenaData.sdk.provider.request({
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESSES.tokens.ORDER,
          data: allowanceData
        }, 'latest']
      });

      const currentAllowance = BigInt(result || '0');
      console.log('🔍 Current ORDER allowance for AMM:', {
        currentAllowance: currentAllowance.toString(),
        requiredAmount: amountWei.toString(),
        needsApproval: currentAllowance < amountWei
      });

      return currentAllowance >= amountWei;
    } catch (error) {
      console.error('❌ Error checking allowance:', error);
      throw error;
    }
  };

  // Approve ORDER tokens for AMM Router
  const approveOrder = async (amount: string) => {
    if (!arenaData?.sdk?.provider || !arenaData.address) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setState({ step: 'approving', isLoading: true });
      console.log('💰 Unlimited approving ORDER for AMM Router...');

      // Max uint256 for unlimited approval
      const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');
      
      // Approve ORDER tokens with unlimited amount
      const approveData = '0x095ea7b3' + 
        CONTRACT_ADDRESSES.liquidity.AMM_ROUTER.slice(2).padStart(64, '0') +
        maxAmount.toString(16).padStart(64, '0');

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: arenaData.address,
          to: CONTRACT_ADDRESSES.tokens.ORDER,
          data: approveData,
          gas: '0x186A0' // 100k gas
        }]
      });

      console.log('✅ ORDER approval transaction:', txHash);
      setState({ step: 'success', isLoading: false, txHash });
      return txHash;
    } catch (error) {
      console.error('❌ ORDER approval failed:', error);
      setState({ step: 'error', isLoading: false, error: error instanceof Error ? error.message : 'Approval failed' });
      throw error;
    }
  };

  // Add ORDER/AVAX Liquidity
  const addLiquidity = async (orderAmount: string, avaxAmount: string) => {
    if (!arenaData?.sdk?.provider || !arenaData.address) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setState({ step: 'adding', isLoading: true });
      console.log('🏊‍♂️ Adding ORDER/AVAX liquidity...', { orderAmount, avaxAmount });

      const orderWei = BigInt(parseFloat(orderAmount) * 1e18);
      const avaxWei = BigInt(parseFloat(avaxAmount) * 1e18);
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes

      // Calculate minimum amounts (95% of desired amounts)
      const orderMinWei = (orderWei * BigInt(95)) / BigInt(100);
      const avaxMinWei = (avaxWei * BigInt(95)) / BigInt(100);

      // addLiquidityAVAX function call
      const addLiquidityData = '0xf91b3f72' + // addLiquidityAVAX selector
        CONTRACT_ADDRESSES.tokens.ORDER.slice(2).padStart(64, '0') + // token
        orderWei.toString(16).padStart(64, '0') + // amountTokenDesired
        orderMinWei.toString(16).padStart(64, '0') + // amountTokenMin
        avaxMinWei.toString(16).padStart(64, '0') + // amountAVAXMin
        arenaData.address.slice(2).padStart(64, '0') + // to
        deadline.toString(16).padStart(64, '0'); // deadline

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: arenaData.address,
          to: CONTRACT_ADDRESSES.liquidity.AMM_ROUTER,
          data: addLiquidityData,
          value: '0x' + avaxWei.toString(16), // Send AVAX
          gas: '0x2DC6C0' // 3M gas
        }]
      });

      console.log('✅ Add liquidity transaction:', txHash);
      setState({ step: 'success', isLoading: false, txHash });
      
      // Trigger LP data refresh
      if (onTransactionSuccess) {
        setTimeout(onTransactionSuccess, 2000); // Wait 2 seconds for blockchain update
      }
      
      return txHash;
    } catch (error) {
      console.error('❌ Add liquidity failed:', error);
      setState({ step: 'error', isLoading: false, error: error instanceof Error ? error.message : 'Add liquidity failed' });
      throw error;
    }
  };

  // Check LP token allowance for AMM Router (for remove liquidity)
  const checkLPAllowance = async (amount: string) => {
    if (!arenaData?.sdk?.provider || !arenaData.address) {
      return false;
    }

    try {
      const amountWei = BigInt(Math.floor(parseFloat(amount) * 1e18));
      
      // Check LP token allowance using ERC20 allowance function
      const allowanceData = '0xdd62ed3e' + // allowance(owner, spender) selector
        arenaData.address.slice(2).padStart(64, '0') + // owner
        CONTRACT_ADDRESSES.liquidity.AMM_ROUTER.slice(2).padStart(64, '0'); // spender

      const result = await arenaData.sdk.provider.request({
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESSES.liquidity.ORDER_AVAX_LP,
          data: allowanceData
        }, 'latest']
      });

      const allowance = BigInt(result || '0');
      console.log('🔍 LP allowance check:', { allowance: allowance.toString(), required: amountWei.toString() });
      
      return allowance >= amountWei;
    } catch (error) {
      console.error('❌ LP allowance check failed:', error);
      return false;
    }
  };

  // Approve LP tokens for AMM Router
  const approveLPTokens = async (amount: string) => {
    if (!arenaData?.sdk?.provider || !arenaData.address) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setState({ step: 'approving', isLoading: true });
      console.log('📝 Unlimited approving LP tokens for AMM...', { amount });

      // Max uint256 for unlimited approval
      const maxAmount = BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff');

      // ERC20 approve function with unlimited amount
      const approveData = '0x095ea7b3' + // approve(spender, amount) selector
        CONTRACT_ADDRESSES.liquidity.AMM_ROUTER.slice(2).padStart(64, '0') + // spender
        maxAmount.toString(16).padStart(64, '0'); // unlimited amount

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: arenaData.address,
          to: CONTRACT_ADDRESSES.liquidity.ORDER_AVAX_LP,
          data: approveData,
          gas: '0x15F90' // 90k gas
        }]
      });

      console.log('✅ LP approval transaction:', txHash);
      setState({ step: 'idle', isLoading: false });
      return txHash;
    } catch (error) {
      console.error('❌ LP approval failed:', error);
      setState({ step: 'error', isLoading: false, error: error instanceof Error ? error.message : 'LP approval failed' });
      throw error;
    }
  };

  // Remove ORDER/AVAX Liquidity
  const removeLiquidity = async (lpAmount: string) => {
    if (!arenaData?.sdk?.provider || !arenaData.address) {
      throw new Error('Arena wallet not connected');
    }

    try {
      setState({ step: 'removing', isLoading: true });
      console.log('🏊‍♂️ Removing ORDER/AVAX liquidity...', { lpAmount });

      const lpWei = BigInt(Math.floor(parseFloat(lpAmount) * 1e18));
      const deadline = BigInt(Math.floor(Date.now() / 1000) + 1800); // 30 minutes
      
      // Calculate minimum amounts (90% of expected to account for slippage)
      const amountTokenMin = BigInt(0); // Set to 0 for now, can be calculated based on reserves
      const amountAVAXMin = BigInt(0); // Set to 0 for now, can be calculated based on reserves

      // removeLiquidityAVAX(address token, uint256 liquidity, uint256 amountTokenMin, uint256 amountAVAXMin, address to, uint256 deadline)
      const removeLiquidityData = '0x33c6b725' + // removeLiquidityAVAX selector
        CONTRACT_ADDRESSES.tokens.ORDER.slice(2).toLowerCase().padStart(64, '0') + // token address
        lpWei.toString(16).padStart(64, '0') + // liquidity amount
        amountTokenMin.toString(16).padStart(64, '0') + // amountTokenMin
        amountAVAXMin.toString(16).padStart(64, '0') + // amountAVAXMin  
        arenaData.address.slice(2).toLowerCase().padStart(64, '0') + // to address
        deadline.toString(16).padStart(64, '0'); // deadline

      console.log('🔍 Remove liquidity data:', {
        selector: '0x33c6b725',
        token: CONTRACT_ADDRESSES.tokens.ORDER,
        liquidity: lpWei.toString(),
        amountTokenMin: amountTokenMin.toString(),
        amountAVAXMin: amountAVAXMin.toString(),
        to: arenaData.address,
        deadline: deadline.toString(),
        fullData: removeLiquidityData
      });

      const txHash = await arenaData.sdk.provider.request({
        method: 'eth_sendTransaction',
        params: [{
          from: arenaData.address,
          to: CONTRACT_ADDRESSES.liquidity.AMM_ROUTER,
          data: removeLiquidityData,
          gas: '0x2DC6C0' // 3M gas
        }]
      });

      console.log('✅ Remove liquidity transaction:', txHash);
      setState({ step: 'success', isLoading: false, txHash });
      
      // Trigger LP data refresh
      if (onTransactionSuccess) {
        setTimeout(onTransactionSuccess, 2000); // Wait 2 seconds for blockchain update
      }
      
      return txHash;
    } catch (error) {
      console.error('❌ Remove liquidity failed:', error);
      setState({ step: 'error', isLoading: false, error: error instanceof Error ? error.message : 'Remove liquidity failed' });
      throw error;
    }
  };

  // Get quote for adding liquidity (calculate required AVAX for given ORDER amount)
  const getQuote = async (orderAmount: string, orderReserve: number, avaxReserve: number) => {
    try {
      if (!arenaData?.sdk?.provider || !orderAmount || orderReserve === 0 || avaxReserve === 0) {
        return null;
      }

      // Convert ORDER amount to wei
      const orderAmountWei = BigInt(Math.floor(Number(orderAmount) * 1e18));
      const orderReserveWei = BigInt(Math.floor(orderReserve * 1e18));
      const avaxReserveWei = BigInt(Math.floor(avaxReserve * 1e18));

      // Use AMM quote function: quote(amountA, reserveA, reserveB)
      const quoteData = '0xad615dec' + // quote selector
        orderAmountWei.toString(16).padStart(64, '0') +
        orderReserveWei.toString(16).padStart(64, '0') +
        avaxReserveWei.toString(16).padStart(64, '0');

      const result = await arenaData.sdk.provider.request({
        method: 'eth_call',
        params: [{
          to: CONTRACT_ADDRESSES.liquidity.AMM_ROUTER,
          data: quoteData
        }, 'latest']
      });

      if (result && result !== '0x') {
        const requiredAvax = Number(BigInt(result)) / 1e18;
        return requiredAvax;
      }

      return null;
    } catch (error) {
      console.error('❌ Quote calculation failed:', error);
      return null;
    }
  };

  return {
    step: state.step,
    isLoading: state.isLoading,
    txHash: state.txHash,
    error: state.error,
    checkAllowance,
    approveOrder,
    addLiquidity,
    removeLiquidity,
    checkLPAllowance,
    approveLPTokens,
    getQuote,
    reset
  };
};
