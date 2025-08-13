import React, { createContext, useContext, useEffect, useRef, useState } from 'react';
import { ethers } from 'ethers';
import { useNavigate } from 'react-router-dom';

import { GetParams } from '../utils/Onboard.js';
import { ABI, ADDRESS } from '../contract';
import { createEventListeners } from './createEventListeners';

const GlobalContext = createContext();

export const GlobalContextProvider = ({ children }) => {
  const [walletAddress, setWalletAddress] = useState('');
  const [battleGround, setBattleGround] = useState('bg-astral');
  const [contract, setContract] = useState(null);
  const [provider, setProvider] = useState(null);
  const [step, setStep] = useState(1);
  const [gameData, setGameData] = useState({ players: [], pendingBattles: [], activeBattle: null });
  const [showAlert, setShowAlert] = useState({ status: false, type: 'info', message: '' });
  const [battleName, setBattleName] = useState('');
  const [errorMessage, setErrorMessage] = useState('');
  const [updateGameData, setUpdateGameData] = useState(0);

  const player1Ref = useRef();
  const player2Ref = useRef();

  const navigate = useNavigate();

  //* Set battleground to local storage
  useEffect(() => {
    const isBattleground = localStorage.getItem('battleground');

    if (isBattleground) {
      setBattleGround(isBattleground);
    } else {
      localStorage.setItem('battleground', battleGround);
    }
  }, []);

  //* Reset web3 onboarding modal params
  useEffect(() => {
    const resetParams = async () => {
      const currentStep = await GetParams();

      setStep(currentStep.step);
    };

    resetParams();

    window?.ethereum?.on('chainChanged', () => resetParams());
    window?.ethereum?.on('accountsChanged', () => resetParams());
  }, []);

  //* Set the wallet address to the state
  const updateCurrentWalletAddress = async () => {
    try {
      if (!window?.ethereum) {
        console.log('MetaMask not found');
        return;
      }

      // First check if already connected (no popup)
      const accounts = await window.ethereum.request({
        method: 'eth_accounts',
      });

      if (accounts && accounts.length > 0) {
        setWalletAddress(accounts[0]);
        return accounts[0];
      }

      // Only request if not connected
      const requestedAccounts = await window.ethereum.request({
        method: 'eth_requestAccounts',
      });

      if (requestedAccounts && requestedAccounts.length > 0) {
        setWalletAddress(requestedAccounts[0]);
        return requestedAccounts[0];
      }
    } catch (error) {
      console.error('Error connecting wallet:', error);
      throw error;
    }
  };

  useEffect(() => {
    // Only check existing connections, don't force connect
    const checkConnection = async () => {
      if (!window?.ethereum) return;

      try {
        const accounts = await window.ethereum.request({
          method: 'eth_accounts',
        });

        if (accounts && accounts.length > 0) {
          setWalletAddress(accounts[0]);
        }
      } catch (error) {
        console.error('Error checking connection:', error);
      }
    };

    checkConnection();

    const handleAccountsChanged = (accounts) => {
      if (accounts.length > 0) {
        setWalletAddress(accounts[0]);
      } else {
        setWalletAddress('');
        setContract('');
        setProvider('');
      }
    };

    window?.ethereum?.on('accountsChanged', handleAccountsChanged);

    return () => {
      window?.ethereum?.removeListener('accountsChanged', handleAccountsChanged);
    };
  }, []);

  //* Manual connect function for user-initiated connections
  const connectWallet = async () => {
    try {
      const address = await updateCurrentWalletAddress();
      if (address) {
        setShowAlert({
          status: true,
          type: 'success',
          message: 'Wallet connected successfully!',
        });
      }
      return address;
    } catch (error) {
      setShowAlert({
        status: true,
        type: 'failure',
        message: 'Failed to connect wallet. Please try again.',
      });
      throw error;
    }
  };

  //* Set the smart contract and provider to the state
  useEffect(() => {
    const setSmartContractAndProvider = async () => {
      if (!walletAddress) return; // Only setup contract if wallet is connected

      try {
        // Use existing wallet connection instead of Web3Modal
        if (window.ethereum) {
          const newProvider = new ethers.providers.Web3Provider(window.ethereum);
          const signer = newProvider.getSigner();
          const newContract = new ethers.Contract(ADDRESS, ABI, signer);

          setProvider(newProvider);
          setContract(newContract);
        }
      } catch (error) {
        console.error('Error setting up contract:', error);
      }
    };

    if (walletAddress) {
      setSmartContractAndProvider();
    }
  }, [walletAddress]); // Only run when wallet address changes

  //* Activate event listeners for the smart contract
  useEffect(() => {
    if (step === -1 && contract) {
      createEventListeners({
        navigate,
        contract,
        provider,
        walletAddress,
        setShowAlert,
        player1Ref,
        player2Ref,
        setUpdateGameData,
      });
    }
  }, [step]);

  //* Set the game data to the state
  useEffect(() => {
    const fetchGameData = async () => {
      if (contract) {
        const fetchedBattles = await contract.getAllBattles();
        const pendingBattles = fetchedBattles.filter((battle) => battle.battleStatus === 0);
        let activeBattle = null;

        fetchedBattles.forEach((battle) => {
          if (battle.players.find((player) => player.toLowerCase() === walletAddress.toLowerCase())) {
            if (battle.winner.startsWith('0x00')) {
              activeBattle = battle;
            }
          }
        });

        setGameData({ pendingBattles: pendingBattles.slice(1), activeBattle });
      }
    };

    fetchGameData();
  }, [contract, updateGameData]);

  //* Handle alerts
  useEffect(() => {
    if (showAlert?.status) {
      const timer = setTimeout(() => {
        setShowAlert({ status: false, type: 'info', message: '' });
      }, [5000]);

      return () => clearTimeout(timer);
    }
  }, [showAlert]);

  //* Handle error messages
  useEffect(() => {
    if (errorMessage) {
      const parsedErrorMessage = errorMessage?.reason?.slice('execution reverted: '.length).slice(0, -1);

      if (parsedErrorMessage) {
        setShowAlert({
          status: true,
          type: 'failure',
          message: parsedErrorMessage,
        });
      }
    }
  }, [errorMessage]);

  return (
    <GlobalContext.Provider
      value={{
        player1Ref,
        player2Ref,
        battleGround,
        setBattleGround,
        contract,
        gameData,
        walletAddress,
        updateCurrentWalletAddress,
        connectWallet,
        showAlert,
        setShowAlert,
        battleName,
        setBattleName,
        errorMessage,
        setErrorMessage,
      }}
    >
      {children}
    </GlobalContext.Provider>
  );
};

export const useGlobalContext = () => useContext(GlobalContext);
