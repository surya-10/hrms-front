import { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { MessagesSquare, X, RefreshCw } from 'lucide-react';
import AgentLoader from '../Layout/animations/DotAnimationForAgent';


const ChatBot = () => {
  const userId = localStorage.getItem("userId");
  const [message, setMessage] = useState('');
  const [messages, setMessages] = useState([]);
  const [parsedData, setParsedData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [confirmationStep, setConfirmationStep] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [showEndButton, setShowEndButton] = useState(false);
  const token = localStorage.getItem("token");
  const userName = JSON.parse(localStorage.getItem("user"))?.username || "User";
  const messagesEndRef = useRef(null);
  const [disableConfirmation, setDisableConfirmation] = useState(false);
  const [placeHolder, setPlaceHolder] = useState("")
  const [userSelectedDates, setUserSelectedDates] = useState({
    start_date: "",
    end_date: "",
    date: ""
  })
  const [processing, setProcessing] = useState(false)
  const [leaveReason, setLeaveReason] = useState("")
  const [userDate, setUserDate] = useState("");
  const [returned, setReturned] = useState(false);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    if (isOpen && messages.length === 0) {
      // Initial greeting messages
      setMessages([
        {
          type: 'bot',
          text: `👋 Welcome ${userName}! I'm your leave management assistant.`
        },
        {
          type: 'bot',
          text: 'Here are some example formats to apply for leave:',
          showExamples: true
        }
      ]);
    }
  }, [isOpen]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, parsedData, confirmationStep]);

  const leaveExamples = [
    "I want leave from Feb 20 2025 to Feb 21 2025 due to personal work",
    "Need leave on Feb 25 2025 due to family function",
    "I need leave from March 1 2025 to March 3 2025 for wedding ceremony"
  ];

  const formatDateForDisplay = (dateStr) => {
    const date = new Date(dateStr);
    const month = date.toLocaleString('default', { month: 'short' });
    const day = date.getDate();
    const year = date.getFullYear();
    return `${month} ${day} ${year}`;
  };

  const showInitialMessages = () => {
    const initialMessages = [
      { 
        type: 'bot', 
        text: `👋 Welcome ${userName}! I'm your leave management assistant.` 
      },
      { 
        type: 'bot',
        text: 'Here are some example formats to apply for leave:',
        showExamples: true
      }
    ];
    setMessages(initialMessages);
  };

  const resetChat = () => {
    setMessages([]);
    setParsedData(null);
    setConfirmationStep(false);
    setDisableConfirmation(false);
    setPlaceHolder("Type your leave request...");
    setLeaveReason("");
    setUserDate("");
    setReturned(false);
    setMessage("");
    setShowEndButton(false);
    showInitialMessages();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!message.trim()) return;

    // Reset states when user enters new input
    if (!returned) {
      setLeaveReason("");
      setUserDate("");
    }

    setMessages(prev => [...prev, { type: 'user', text: message }]);
    setLoading(true);
    setError(null);

    try {
      setProcessing(true);
      const obj = {
        data: returned ? `${userDate} ${message}` : message
      };

      const res = await axios.post("http://localhost:3002/api/routes/apply-leave-nlp/apply-leave", obj, {
        headers: {
          authorization: `Bearer ${token}`
        }
      });

      // First check if we have valid dates
      if (!res.data.date || res.data.date.length === 0) {
        setMessages(prev => [...prev, {
          type: 'bot',
          text: "Please provide the dates for your leave request. You can use formats like:\n- Feb 20 2025 to Feb 21 2025\n- March 1 2025",
          isConfirmation: false
        }]);
        setPlaceHolder("Enter dates for your leave");
        return;
      }

      // Store the dates if found
      const dates = res.data.date;
      setUserSelectedDates({
        start_date: dates[0].start,
        end_date: dates[0].end,
        date: dates[0].start
      });

      // Then check for reason
      if (res.data.reason === "not found" || !res.data.reason) {
        if (!returned) {
          setUserDate(message);
        }
        const startDate = formatDateForDisplay(dates[0].start);
        const endDate = formatDateForDisplay(dates[0].end);
        setMessages(prev => [...prev, {
          type: 'bot',
          text: `I see you want leave from ${startDate} to ${endDate}. Please provide a reason for your leave request. For example: 'due to personal work' or 'for medical appointment'`,
          isConfirmation: false
        }]);
        setPlaceHolder("Enter your reason here");
        setReturned(true);
        return;
      }

      // If we have both dates and reason
      setLeaveReason(res.data.reason);
      setReturned(false);

      // Only show confirmation if we have a valid reason (not "not found")
      if (res.data.reason && res.data.reason !== "not found") {
        const startDate = formatDateForDisplay(dates[0].start);
        const endDate = formatDateForDisplay(dates[0].end);
        const confirmationMessage = `I understand you want to take leave from ${startDate} to ${endDate} for ${res.data.reason}. Would you like me to submit this leave request?`;
        
        setMessages(prev => [...prev, {
          type: 'bot',
          text: confirmationMessage,
          isConfirmation: true
        }]);
        setConfirmationStep(true);
      }

    } catch (err) {
      console.error(err);
      setMessages(prev => [...prev, {
        type: 'bot',
        text: "I'm having trouble understanding your request. Please provide both dates and reason for your leave. For example: 'I want leave from Feb 20 2025 to Feb 21 2025 due to personal work'",
        isConfirmation: false
      }]);
      // Reset states on error
      setLeaveReason("");
      setUserDate("");
      setReturned(false);
    } finally {
      setLoading(false);
      setProcessing(false);
      setMessage('');
    }
  };

  const handleConfirmation = async (isConfirmed) => {
    console.log(isConfirmed)
    if (isConfirmed) {
      console.log("confiurmed")
      try {
        setProcessing(true)
        const leaveRequest = {
          leave_request: {
            timeoff_type: 'full_day',
            leave_type: "Personal",
            leave_date: [userSelectedDates],
            is_permission: false,
            status_name: "Requested",
            initialed_on: "",
            comments: leaveReason,
            status: true,
            is_half_day_leave: false
          },
          date: userSelectedDates.start_date
        };
        console.log(leaveRequest, 132);
        const response = await axios.post(
          `http://localhost:3002/api/routes/time-off/create-timeoff/${userId}`,
          leaveRequest,
          {
            headers: {
              authorization: `Bearer ${token}`,
            },
          }
        );
        console.log(response.data)
        if (response.data) {
          setMessages(prev => [
            ...prev,
            {
              type: 'bot',
              text: "✅ Great! Your leave request has been submitted successfully. You will receive a confirmation email as well."
            }
          ]);

          // Show end button after successful submission
          setShowEndButton(true);

          // Reset all states after successful submission
          setParsedData(null);
          setConfirmationStep(false);
          setLeaveReason("");
          setUserDate("");
          setReturned(false);
        }
      } catch (error) {
        console.log(error)
        const errorMessage = error.response?.data?.message || 'Failed to submit leave request. Please try again.';
        setMessages(prev => [
          ...prev,
          {
            type: 'bot',
            text: errorMessage + "😒." + "Try selecting different dates."
          }
        ]);
        // Reset states on error
        setParsedData(null);
        setConfirmationStep(false);
        setLeaveReason("");
        setUserDate("");
        setReturned(false);
        setDisableConfirmation(false);
        setShowEndButton(false);
      } finally {
        setProcessing(false)
      }
    } else {
      setMessages(prev => [...prev, {
        type: 'bot',
        text: "No problem. Please provide your leave details again."
      }]);
      // Reset all states when user clicks No
      setParsedData(null);
      setConfirmationStep(false);
      setLeaveReason("");
      setUserDate("");
      setReturned(false);
      setDisableConfirmation(false);
      setShowEndButton(false);
    }
  };

  const toggleChat = () => {
    setIsOpen(!isOpen);
    if (!isOpen) {
      scrollToBottom();
    }
  };

  const handleLeaveExample = () => {
    setMessage("I want to apply leave from 25/03/2025 to 26/03/2025 due to personal work");
  };


  return (
    <div className="fixed bottom-4 right-4 z-50">
      {!isOpen ? (
        <button
          onClick={toggleChat}
          className="w-14 h-14 bg-indigo-500 rounded-full shadow-lg hover:bg-indigo-600 transition-all transform hover:scale-105 flex items-center justify-center"
        >
          <MessagesSquare className="h-8 w-8 text-white" />
        </button>
      ) : (
        <div className="w-96 bg-white shadow-2xl rounded-lg overflow-hidden">
          {/* Chat Header */}
          <div className="bg-indigo-500 p-4 flex justify-between items-center">
            <h2 className="text-lg font-semibold text-white">Leave Assistant</h2>
            <div className="flex gap-2">
              <button 
                onClick={resetChat}
                className="text-white hover:text-gray-200 p-1 rounded-full hover:bg-indigo-600"
                title="Start New Chat"
              >
                <RefreshCw className="h-5 w-5" />
              </button>
              <button onClick={toggleChat} className="text-white hover:text-gray-200">
                <X className="h-6 w-6" />
              </button>
            </div>
          </div>

          {/* Chat Messages */}
          <div className="h-[400px] overflow-y-auto p-4 space-y-4">
            {messages.map((msg, idx) => (
              <div key={idx} className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] p-3 rounded-lg ${msg.type === 'user'
                  ? 'bg-indigo-500 text-white'
                  : 'bg-gray-100 text-gray-800 shadow-xl'
                  }`}>
                  <p className="text-sm">{msg.text}</p>
                  {msg.isConfirmation && (
                    <div className="flex gap-2 mt-3">
                      <button
                        onClick={() => {
                          handleConfirmation(true);
                          setDisableConfirmation(true)
                        }}
                        className={`px-3 py-1 bg-green-500 text-white text-sm rounded hover:bg-green-600 ${disableConfirmation ? "cursor-not-allowed" : ""} `}
                      >
                        Yes
                      </button>
                      <button
                        onClick={() => {
                          handleConfirmation(false)
                          setDisableConfirmation(true)
                        }}
                        className={`px-3 py-1 bg-red-500 text-white text-sm rounded hover:bg-red-600 ${disableConfirmation ? "cursor-not-allowed" : ""}`}
                      >
                        No
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))}
            {processing &&
              <div className='flex flex-start h-[30px] w-[80px] rounded-xl'>
                <AgentLoader />
              </div>
            }
            {messages.length === 2 && (
              <div className="space-y-2 mt-4">
                <p className="text-sm text-gray-600">Here's how you can apply for leave:</p>
                <button
                  onClick={handleLeaveExample}
                  className="w-full p-2 text-left text-sm bg-gray-50 hover:bg-gray-100 rounded-lg transition-colors"
                >
                  "I want to apply leave from 25/03/2025 to 26/03/2025 due to personal work"
                </button>
              </div>
            )}
            {showEndButton && (
              <div className="flex justify-center mt-4">
                <button
                  onClick={() => setIsOpen(false)}
                  className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 transition-colors"
                >
                  End Chat
                </button>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>

          <div className="p-4 border-t">
            <form onSubmit={handleSubmit} className="flex gap-2">
              <input
                type="text"
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                placeholder={placeHolder}
                disabled={loading || showEndButton}
                className="flex-1 p-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
              <button
                type="submit"
                disabled={loading || showEndButton}
                className="px-4 py-2 bg-indigo-500 text-white rounded-lg hover:bg-indigo-600 disabled:opacity-50"
              >
                Send
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default ChatBot;
