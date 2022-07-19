import React, { useEffect, useState } from "react";
import { ethers } from "ethers";

import { contractAbi, contractAddress } from "../utils/constans";

export const TransactionContext = React.createContext();
const { ethereum } = window;

const getEthereumContract = () => {
  const provider = new ethers.providers.Web3Provider(ethereum);
  const signer = provider.getSigner();
  const transactionContract = new ethers.Contract(
    contractAddress,
    contractAbi,
    signer
  );

  return transactionContract;
};
export const TransactionsProvider = ({ children }) => {
  const [currentAccount, setCurrentAccount] = useState("");
  const [transactionsCount, setTransactionsCount] = useState(localStorage.getItem('transactionsCount'));
  const [isLoading, setisLoading] = useState(false);
  const [transactions, setTransactions] = useState([])
  const [formData, setFormData] = useState({
    addressTo: "",
    amount: "",
    keyword: "",
    message: ""
  });
  
  const handleChange = (e, name) => {
    setFormData((prevState) => ({ ...prevState, [name]: e.target.value }));
  };
  const getAllTransactions = async () =>{
    try {
      if (!ethereum) return alert("please install metamask.");
      const transactionContract = getEthereumContract();
      const availableTransactions = await transactionContract.getAllTransactions();
      const structuredTransactions = availableTransactions.map((transaction) => ({
        addressTo: transaction.receiver,
        addressFrom: transaction.sender,
        timestamp: new Date(transaction.timestamp.toNumber() * 1000).toLocaleString(),
        message: transaction.message,
        keyword: transaction.keyword,
        amount: parseInt(transaction.amount._hex) / (10 ** 18)
      }));

      console.log(structuredTransactions);

      setTransactions(structuredTransactions);
  } catch (error) {
      console.log(error);
    }
};

  const checkIfWallletIsConnnected = async () => {
    try {
      if (!ethereum) return alert("please install metamask.");
      const accounts = await ethereum.request({ method: "eth_accounts" });
      if (accounts.length) {
        setCurrentAccount(accounts[0]);
        getAllTransactions();
      } else {
        console.log("No accounts found");
      }
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object Found!");
    }
  };
  const checkIfTransactionsExist = async () => {
    try {
      const transactionContract = getEthereumContract();
      const transactionsCount = await transactionContract.getTransactionCount();
      window.localStorage.setItem("transactionsCount", transactionsCount)
    } catch (error) {
      throw new error("Transactions doesn't exist")
    }
  }



  const connectWallet = async () => {
    try {
      if (!ethereum) return alert("please install metamask");
      const accounts = await ethereum.request({
        method: "eth_requestAccounts",
      });
      setCurrentAccount(accounts[0]);
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object Found!");
    }
  };
  const sendTransactions = async () => {
    try {
      if (!ethereum) return alert("please install metamask");
      const { addressTo, amount, keyword, message} = formData;
      const transactionContract = getEthereumContract();
      const parseAmount = ethers.utils.parseEther(amount);

      await ethereum.request({
        method: 'eth_sendTransaction',
        params: [{
          from: currentAccount,
          to: addressTo,
          gas: '0x5208',
          value: parseAmount._hex,
        }],
      });
     const transactionHash = await transactionContract.addToBlockchain(addressTo, parseAmount, message, keyword);
      setisLoading(true);
      console.log(`Loading - ${transactionHash.hash}`);
      await transactionHash.wait();
      setisLoading(false);
      console.log(`Success - ${transactionHash.hash}`);
      const transactionsCount = await transactionContract.getTransactionCount();
      setTransactionsCount(transactionsCount.toNumber());
    } catch (error) {
      console.log(error);

      throw new Error("No ethereum object Found!");
    }
  };

  useEffect(() => {
    checkIfWallletIsConnnected();
    checkIfTransactionsExist();
  }, []);
  return (
    <TransactionContext.Provider
      value={{
        connectWallet,
        currentAccount,
        formData,
        sendTransactions,
        handleChange,
        transactions,
        isLoading,
      }}
    >
      {children}
    </TransactionContext.Provider>
  );
};
