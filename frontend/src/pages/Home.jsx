import React, { useContext, useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { CgMenuRight } from "react-icons/cg";
import { RxCross1 } from "react-icons/rx";

import { userDataContext } from '../context/UserContext';
import aiImg from "../assets/ai.gif";
import userImg from "../assets/user.gif";

const Home = () => {
  const { userData, serverUrl, setUserData, getGeminiResponse } = useContext(userDataContext);
  const navigate = useNavigate();
  const [listening, setListening] = useState(false);
  const [userText, setUserText] = useState("");
  const [aiText, setAiText] = useState("");
  const [ham, setHam] = useState(false);
  const [pendingLink, setPendingLink] = useState(null);
  const [pendingLabel, setPendingLabel] = useState("");
  const isSpeakingRef = useRef(false);
  const recognitionRef = useRef(null);
  const isRecognizingRef = useRef(false);
  const synth = window.speechSynthesis;

  // 🔹 Logout
  const handleLogOut = async () => {
    try {
      await axios.get(`${serverUrl}/api/auth/logout`, { withCredentials: true });
      setUserData(null);
      navigate("/signin");
    } catch (error) {
      setUserData(null);
      console.log(error);
    }
  };

  // 🔹 Speak in Hindi
  const speak = (text) => {
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = 'hi-IN';
    const voices = synth.getVoices();
    const hindiVoice = voices.find(v => v.lang === 'hi-IN');
    if (hindiVoice) utterance.voice = hindiVoice;

    isSpeakingRef.current = true;
    utterance.onend = () => {
      setAiText("");
      isSpeakingRef.current = false;
      setTimeout(() => startRecognition(), 800);
    };
    synth.cancel();
    synth.speak(utterance);
  };

  // 🔹 Start Recognition
  const startRecognition = () => {
    if (!isSpeakingRef.current && !isRecognizingRef.current) {
      try {
        recognitionRef.current?.start();
      } catch (error) {
        if (error.name !== "InvalidStateError") console.error(error);
      }
    }
  };

  // 🔹 Handle Commands
  const handleCommand = (data) => {
    const { type, userInput, response } = data;

    speak(response);

    let link = null;
    let label = "";

    switch(type) {
      case 'youtube-search':
      case 'youtube-play':
        link = `https://www.youtube.com/results?search_query=${encodeURIComponent(userInput)}`;
        label = `Open YouTube for "${userInput}"`;
        break;
      case 'google-search':
        link = `https://www.google.com/search?q=${encodeURIComponent(userInput)}`;
        label = `Open Google for "${userInput}"`;
        break;
      case 'calculator-open':
        link = `https://www.google.com/search?q=calculator`;
        label = `Open Calculator`;
        break;
      case 'instagram-open':
        link = `https://www.instagram.com/`;
        label = `Open Instagram`;
        break;
      case 'facebook-open':
        link = `https://www.facebook.com/`;
        label = `Open Facebook`;
        break;
      case 'weather-show':
        link = `https://www.google.com/search?q=weather`;
        label = `Show Weather`;
        break;
      default:
        break;
    }

    if (link && label) {
      setPendingLink(link);
      setPendingLabel(label);
    } else {
      setPendingLink(null);
      setPendingLabel("");
    }
  };

  // 🔹 Clear History
  const handleClearHistory = () => {
    setUserData(prev => ({
      ...prev,
      history: []
    }));
  };

  // 🔹 Setup Speech Recognition
  useEffect(() => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    const recognition = new SpeechRecognition();
    recognition.continuous = true;
    recognition.lang = 'en-US';
    recognition.interimResults = false;
    recognitionRef.current = recognition;

    let isMounted = true;

    recognition.onstart = () => {
      isRecognizingRef.current = true;
      setListening(true);
    };

    recognition.onend = () => {
      isRecognizingRef.current = false;
      setListening(false);
      if (isMounted && !isSpeakingRef.current) setTimeout(() => startRecognition(), 1000);
    };

    recognition.onerror = (event) => {
      console.warn("Recognition error:", event.error);
      isRecognizingRef.current = false;
      setListening(false);
    };

    recognition.onresult = async (e) => {
      const transcript = e.results[e.results.length - 1][0].transcript.trim();
      if (transcript.toLowerCase().includes(userData.assistantName.toLowerCase())) {
        setAiText("");
        setUserText("");

        recognition.stop();
        isRecognizingRef.current = false;
        setListening(false);

        const data = await getGeminiResponse(transcript);

        setUserData(prev => ({
          ...prev,
          history: [...(prev.history || []), transcript]
        }));

        handleCommand(data);
        setAiText(data.response);
      }
    };

    startRecognition();

    const greeting = new SpeechSynthesisUtterance(`नमस्ते ${userData.name}, मैं आपकी मदद कैसे कर सकती हूँ?`);
    greeting.lang = 'hi-IN';
    synth.speak(greeting);

    return () => {
      isMounted = false;
      recognition.stop();
      setListening(false);
      isRecognizingRef.current = false;
    };
  }, []);

  return (
    <div className='w-full h-[100vh] bg-gradient-to-t from-black to-[#02023d] flex'>
      
      {/* Sidebar */}
      <div className={`bg-[#000000b3] backdrop-blur-lg w-[250px] p-5 flex flex-col gap-5 absolute transition-transform z-50 ${ham ? "translate-x-0" : "-translate-x-full"}`}>
        <div className='flex justify-between items-center'>
          <h1 className='text-white font-semibold text-lg'>Menu</h1>
          <RxCross1 className='text-white w-6 h-6 cursor-pointer' onClick={() => setHam(false)} />
        </div>

        <button className='w-full h-[50px] text-black font-semibold bg-white rounded-full' onClick={handleLogOut}>Log Out</button>
        <button className='w-full h-[50px] text-black font-semibold bg-white rounded-full' onClick={() => navigate("/customize")}>Customize Assistant</button>
        <button className='w-full h-[50px] text-black font-semibold bg-white rounded-full' onClick={handleClearHistory}>Clear History</button>

        <div className='w-full h-[1px] bg-gray-400 my-2'></div>
        <h2 className='text-white font-semibold'>History</h2>
        <div className='flex flex-col gap-2 overflow-y-auto max-h-[300px]'>
          {userData.history?.map((his, i) => (
            <div key={i} className='text-gray-200 text-[16px] truncate'>{his}</div>
          ))}
        </div>
      </div>

      {/* Main Content */}
      <div className='flex-1 flex flex-col justify-center items-center gap-5 ml-0 relative'>
        <CgMenuRight className='text-white absolute top-5 right-5 w-6 h-6 cursor-pointer' onClick={() => setHam(true)} />

        <div className='w-[300px] h-[400px] flex justify-center items-center overflow-hidden rounded-4xl shadow-lg'>
          <img src={userData?.assistantImage} alt="" className='h-full object-cover' />
        </div>

        <h1 className='text-white text-[18px] font-semibold'>I'm {userData?.assistantName}</h1>
        {!aiText && <img src={userImg} alt="" className='w-[200px]' />}
        {aiText && <img src={aiImg} alt="" className='w-[200px]' />}
        <h1 className='text-white text-[18px] font-semibold text-wrap'>{userText ? userText : aiText ? aiText : null}</h1>

        {/* Dynamic Button */}
        {pendingLink && (
          <a
            href={pendingLink}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-6 mb-1 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-2xl shadow-lg hover:scale-105 transition-transform text-center"
            onClick={() => setPendingLink(null)}
          >
            {pendingLabel}
          </a>
        )}
      </div>
    </div>
  );
};

export default Home;
