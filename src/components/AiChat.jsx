import React, { useState, useEffect, useRef } from 'react';
import { 
  Box, 
  IconButton, 
  Paper, 
  TextField, 
  Typography,
  CircularProgress,
  Collapse
} from '@mui/material';
import SmartToyIcon from '@mui/icons-material/SmartToy';
import SendIcon from '@mui/icons-material/Send';
import CloseIcon from '@mui/icons-material/Close';
import api from '../utils/axiosConfig';

const AiChat = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [message, setMessage] = useState('');
  const [chatHistory, setChatHistory] = useState([]);
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const chatSessionRef = useRef(null);

  // Load chat history from localStorage on component mount
  useEffect(() => {
    const savedChat = localStorage.getItem('geminiChat');
    if (savedChat) {
      const { messages, timestamp } = JSON.parse(savedChat);
      // Check if chat is less than 2 hours old
      if (Date.now() - timestamp < 2 * 60 * 60 * 1000) {
        setChatHistory(messages);
      } else {
        // Clear old chat
        localStorage.removeItem('geminiChat');
      }
    }
  }, []);

  // Save chat history to localStorage whenever it changes
  useEffect(() => {
    if (chatHistory.length > 0) {
      localStorage.setItem('geminiChat', JSON.stringify({
        messages: chatHistory,
        timestamp: Date.now()
      }));
    }
  }, [chatHistory]);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [chatHistory]);

  const handleSend = async () => {
    if (!message.trim()) return;

    const userMessage = message.trim();
    setMessage('');
    setLoading(true);

    // Add user message to chat
    setChatHistory(prev => [...prev, { role: 'user', content: userMessage }]);

    try {
      const response = await api.post('/gemini/chat', { 
        message: userMessage,
        chatId: chatSessionRef.current // Send the chat session ID if it exists
      });

      // Store the chat session ID if it's a new session
      if (response.data.chatId) {
        chatSessionRef.current = response.data.chatId;
      }

      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: response.data.response 
      }]);
    } catch (error) {
      console.error('Error sending message:', error);
      setChatHistory(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, I encountered an error. Please try again.' 
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
    <Box
      sx={{
        position: 'fixed',
        bottom: 20,
        right: 20,
        zIndex: 1000,
      }}
    >
      {/* Chat Button */}
      <IconButton
        onClick={() => setIsOpen(!isOpen)}
        sx={{
          bgcolor: '#5E58D5',
          color: 'white',
          width: 56,
          height: 56,
          boxShadow: 3,
          '&:hover': {
            bgcolor: '#4A45C2',
          },
        }}
      >
        {isOpen ? <CloseIcon /> : <SmartToyIcon />}
      </IconButton>

      {/* Chat Window */}
      <Collapse in={isOpen} sx={{ position: 'absolute', bottom: 70, right: 0 }}>
        <Paper
          elevation={3}
          sx={{
            width: 350,
            height: 500,
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
          }}
        >
          {/* Chat Header */}
          <Box sx={{ p: 2, bgcolor: '#5E58D5', color: 'white' }}>
            <Typography variant="h6">Chat with AI Assistant</Typography>
          </Box>

          {/* Messages Area */}
          <Box
            sx={{
              flex: 1,
              overflowY: 'auto',
              p: 2,
              display: 'flex',
              flexDirection: 'column',
              gap: 2,
            }}
          >
            {chatHistory.map((msg, index) => (
              <Box
                key={index}
                sx={{
                  alignSelf: msg.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%',
                }}
              >
                <Paper
                  elevation={1}
                  sx={{
                    p: 1.5,
                    bgcolor: msg.role === 'user' ? '#5E58D5' : '#f5f5f5',
                    color: msg.role === 'user' ? 'white' : 'text.primary',
                  }}
                >
                  <Typography variant="body1">{msg.content}</Typography>
                </Paper>
              </Box>
            ))}
            {loading && (
              <Box sx={{ alignSelf: 'flex-start' }}>
                <CircularProgress size={20} />
              </Box>
            )}
            <div ref={messagesEndRef} />
          </Box>

          {/* Input Area */}
          <Box sx={{ p: 2, borderTop: 1, borderColor: 'divider' }}>
            <TextField
              fullWidth
              multiline
              maxRows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your message..."
              variant="outlined"
              size="small"
              InputProps={{
                endAdornment: (
                  <IconButton
                    onClick={handleSend}
                    disabled={!message.trim() || loading}
                    sx={{ color: '#5E58D5' }}
                  >
                    <SendIcon />
                  </IconButton>
                ),
              }}
            />
          </Box>
        </Paper>
      </Collapse>
    </Box>
  );
};

export default AiChat;