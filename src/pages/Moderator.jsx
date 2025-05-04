import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';

const ModeratorPage = () => {
  const [messages, setMessages] = useState([]);
  const navigate = useNavigate();

  const api = axios.create({
    baseURL: 'http://localhost:3000/mod',
    withCredentials: true,
  });

  // Fetch initial data
  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const messagesRes = await api.get('/messages');
        setMessages(messagesRes.data);
      } catch (error) {
        console.error('Error fetching messages:', error);
      }
    };

    fetchMessages();
  }, []);

  // Mark status function
  const handleMarkStatus = async (messageId, newStatus) => {
    try {
      await api.patch(`/messages/${messageId}/status`, { status: newStatus });
      setMessages(messages.map(message => 
        message.id === messageId 
          ? { ...message, status: newStatus }
          : message
      ));
    } catch (error) {
      alert(`Error updating message status: ${error.response?.data?.error || error.message}`);
    }
  };

  // Logout function
  const handleLogout = async () => {
    try {
      await axios.get('/api/auth/logout', { withCredentials: true });
      alert('Logged out successfully');
      navigate('/login');
    } catch (error) {
      alert('Error logging out: ' + error.message);
    }
  };

  // Separate messages by status
  const newMessages = messages.filter(message => message.status === 'new');
  const seenMessages = messages.filter(message => message.status === 'seen');

  return (
    <div style={styles.container}>
      {/* Header with FitTrack logo and Logout button */}
      <header style={styles.header}>
        <div style={styles.logoContainer}>
          <h1 style={styles.logoText}>FitTrack</h1>
        </div>
        <h1 style={styles.pageHeader}>Moderator Dashboard</h1>
        <button onClick={handleLogout} style={styles.logoutButton}>
          Logout
        </button>
      </header>

      {/* Messages Section */}
      <section style={styles.section}>
        <h2>Messages</h2>
        
        {/* New Messages */}
        <div style={styles.messageSection}>
          <h3 style={styles.sectionHeader}>New Messages</h3>
          <div style={styles.messagesContainer}>
            {newMessages.map(message => (
              <div key={message.id} style={{...styles.messageCard, borderLeft: '4px solid #ff4444'}}>
                <div style={styles.statusBadge}>New</div>
                <div style={styles.isolatedContent}>
                  <p style={styles.messageContent}>
                    {message.content}
                  </p>
                </div>

                <div style={styles.messageMeta}>
                  <div style={styles.metaLeft}>
                    <span>Type: {message.message_type}</span>
                    <span>User Email: {message.email}</span>
                    <span>Status: {message.status}</span>
                  </div>
                  <div style={styles.metaRight}>
                    <span>{new Date(message.created_at).toLocaleString()}</span>
                    <span>User ID: {message.user_id}</span>
                  </div>
                </div>

                {(message.fname || message.lname) && (
                  <div style={styles.nameContainer}>
                    <span>Name: {message.fname} {message.lname}</span>
                  </div>
                )}

                <div style={styles.buttonContainer}>
                  <button 
                    onClick={() => handleMarkStatus(message.id, 'seen')}
                    style={styles.seenButton}
                  >
                    Mark as Seen
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Seen Messages */}
        <div style={styles.messageSection}>
          <h3 style={styles.sectionHeader}>Seen Messages</h3>
          <div style={styles.messagesContainer}>
            {seenMessages.map(message => (
              <div key={message.id} style={{...styles.messageCard, borderLeft: '4px solid #4CAF50'}}>
                <div style={styles.statusBadge}>Seen</div>
                <div style={styles.isolatedContent}>
                  <p style={styles.messageContent}>
                    {message.content}
                  </p>
                </div>

                <div style={styles.messageMeta}>
                  <div style={styles.metaLeft}>
                    <span>Type: {message.message_type}</span>
                    <span>User Email: {message.email}</span>
                    <span>Status: {message.status}</span>
                  </div>
                  <div style={styles.metaRight}>
                    <span>{new Date(message.created_at).toLocaleString()}</span>
                    <span>User ID: {message.user_id}</span>
                  </div>
                </div>

                {(message.fname || message.lname) && (
                  <div style={styles.nameContainer}>
                    <span>Name: {message.fname} {message.lname}</span>
                  </div>
                )}

                <div style={styles.buttonContainer}>
                  <button 
                    onClick={() => handleMarkStatus(message.id, 'new')}
                    style={styles.newButton}
                  >
                    Mark as New
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>
    </div>
  );
};

const styles = {
  container: {
    padding: '20px',
    fontFamily: 'Arial, sans-serif',
  },
  header: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: '20px',
    padding: '10px',
    backgroundColor: 'rgb(94, 88, 213)',
    borderBottom: '1px solid #ddd',
  },
  logoContainer: {
    display: 'flex',
    alignItems: 'center',
  },
  logoText: {
    fontSize: '24px',
    fontWeight: 'bold',
    color: '#333',
  },
  pageHeader: {
    textAlign: 'center',
    marginBottom: '20px',
    backgroundColor: 'rgb(94, 88, 213)',
  },
  logoutButton: {
    padding: '10px 20px',
    fontSize: '16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    cursor: 'pointer',
    borderRadius: '5px',
  },
  section: {
    margin: '20px 0',
    padding: '20px',
    backgroundColor: '#f5f5f5',
    borderRadius: '8px',
  },
  messagesContainer: {
    maxWidth: '100%',
    overflow: 'hidden',
  },
  messageCard: {
    padding: '15px',
    backgroundColor: 'white',
    borderRadius: '8px',
    boxShadow: '0 2px 4px rgba(0,0,0,0.1)',
    border: '1px solid #e0e0e0',
    marginBottom: '15px',
    maxWidth: '100%',
    boxSizing: 'border-box',
    overflow: 'hidden',
  },
  isolatedContent: {
    borderTop: '2px solid #f0f0f0',
    borderBottom: '2px solid #f0f0f0',
    padding: '15px 0',
    margin: '10px 0',
    backgroundColor: '#fafafa',
    overflow: 'hidden',
    wordBreak: 'break-word',
  },
  messageContent: {
    fontSize: '16px',
    color: '#333',
    margin: 0,
    lineHeight: 1.5,
    whiteSpace: 'pre-wrap',
    wordBreak: 'break-word',
    overflowWrap: 'break-word',
    maxWidth: '100%',
  },
  messageMeta: {
    display: 'flex',
    justifyContent: 'space-between',
    fontSize: '14px',
    color: '#666',
    gap: '15px',
    flexWrap: 'wrap',
  },
  metaLeft: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-start',
  },
  metaRight: {
    display: 'flex',
    flexDirection: 'column',
    alignItems: 'flex-end',
  },
  nameContainer: {
    marginTop: '10px',
    paddingTop: '10px',
    borderTop: '1px dashed #eee',
    fontSize: '14px',
    color: '#444',
  },
  deleteButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  seenButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#4CAF50',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  newButton: {
    marginTop: '10px',
    padding: '8px 16px',
    backgroundColor: '#ff4444',
    color: 'white',
    border: 'none',
    borderRadius: '4px',
    cursor: 'pointer',
  },
  buttonContainer: {
    display: 'flex',
    gap: '10px',
    marginTop: '10px',
  },
  messageSection: {
    marginBottom: '30px',
  },
  sectionHeader: {
    fontSize: '18px',
    fontWeight: 'bold',
    marginBottom: '15px',
    color: '#333',
    borderBottom: '2px solid #eee',
    paddingBottom: '8px',
  },
  statusBadge: {
    display: 'inline-block',
    padding: '4px 8px',
    borderRadius: '4px',
    fontSize: '12px',
    fontWeight: 'bold',
    marginBottom: '10px',
    color: 'white',
    backgroundColor: '#666',
  },
};

export default ModeratorPage;