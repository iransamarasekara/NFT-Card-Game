import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';

import { CustomButton, CustomInput, PageHOC } from '../components';
import { useGlobalContext } from '../context';

const Home = () => {
  const { contract, walletAddress, gameData, setShowAlert, setErrorMessage, connectWallet } = useGlobalContext();
  const [playerName, setPlayerName] = useState('');
  const navigate = useNavigate();

  const handleClick = async () => {
    try {
      // First ensure wallet is connected
      if (!walletAddress) {
        await connectWallet();
        return;
      }

      if (!contract) {
        setShowAlert({
          status: true,
          type: 'failure',
          message: 'Please connect your wallet first!',
        });
        return;
      }

      const playerExists = await contract.isPlayer(walletAddress);

      if (!playerExists) {
        await contract.registerPlayer(playerName, playerName, { gasLimit: 500000 });

        setShowAlert({
          status: true,
          type: 'info',
          message: `${playerName} is being summoned!`,
        });

        setTimeout(() => navigate('/create-battle'), 8000);
      }
    } catch (error) {
      setErrorMessage(error);
    }
  };

  useEffect(() => {
    const createPlayerToken = async () => {
      const playerExists = await contract.isPlayer(walletAddress);
      const playerTokenExists = await contract.isPlayerToken(walletAddress);

      if (playerExists && playerTokenExists) navigate('/create-battle');
    };

    if (contract) createPlayerToken();
  }, [contract]);

  useEffect(() => {
    if (gameData.activeBattle) {
      navigate(`/battle/${gameData.activeBattle.name}`);
    }
  }, [gameData]);

  return (
    <div className="flex flex-col">
      {!walletAddress ? (
        <>
          <p className="text-center mb-4 text-white">
            Connect your wallet to start playing!
          </p>
          <CustomButton
            title="Connect Wallet"
            handleClick={handleClick}
            restStyles="mt-6"
          />
        </>
      ) : (
        <>
          <CustomInput
            label="Name"
            placeHolder="Enter your player name"
            value={playerName}
            handleValueChange={setPlayerName}
          />

          <CustomButton
            title="Register"
            handleClick={handleClick}
            restStyles="mt-6"
          />
        </>
      )}
    </div>
  );
};

export default PageHOC(
  Home,
  <>
    Welcome to Avax Gods <br /> a Web3 NFT Card Game
  </>,
  <>
    Connect your wallet to start playing <br /> the ultimate Web3 Battle Card
    Game
  </>,
);
