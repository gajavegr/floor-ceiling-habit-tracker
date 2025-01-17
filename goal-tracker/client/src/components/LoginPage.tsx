import React, { useState, useEffect } from 'react';
import { Box, Button, TextField, Typography, Paper } from '@mui/material';
import { API_URL } from '../config';

interface User {
  id: string;
  name: string;
}

interface LoginPageProps {
  onLogin: (userId: string) => void;
}

export const LoginPage: React.FC<LoginPageProps> = ({ onLogin }) => {
  const [users, setUsers] = useState<User[]>([]);
  const [newUserName, setNewUserName] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  useEffect(() => {
    const fetchUsers = async () => {
      try {
        const response = await fetch(`${API_URL}/api/users`);
        const data = await response.json();
        setUsers(data);
      } catch (error) {
        console.error('Error fetching users:', error);
      }
    };
    fetchUsers();
  }, []);

  const handleRegister = async () => {
    if (!newUserName.trim()) return;

    try {
      const response = await fetch(`${API_URL}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name: newUserName }),
      });
      const newUser = await response.json();
      setUsers([...users, newUser]);
      setNewUserName('');
      setIsRegistering(false);
    } catch (error) {
      console.error('Error registering user:', error);
    }
  };

  return (
    <Box
      sx={{
        height: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        backgroundColor: 'background.default',
      }}
    >
      <Paper
        sx={{
          p: 4,
          width: '100%',
          maxWidth: 400,
          display: 'flex',
          flexDirection: 'column',
          gap: 2,
        }}
      >
        <Typography variant="h4" gutterBottom textAlign="center">
          Goal Tracker
        </Typography>

        {users.map((user) => (
          <Button
            key={user.id}
            variant="contained"
            size="large"
            onClick={() => onLogin(user.id)}
            sx={{ py: 2 }}
          >
            {user.name}
          </Button>
        ))}

        {isRegistering ? (
          <Box sx={{ display: 'flex', gap: 1 }}>
            <TextField
              fullWidth
              value={newUserName}
              onChange={(e) => setNewUserName(e.target.value)}
              placeholder="Enter your name"
            />
            <Button variant="contained" onClick={handleRegister}>
              Save
            </Button>
          </Box>
        ) : (
          <Button
            variant="outlined"
            onClick={() => setIsRegistering(true)}
            sx={{ mt: 2 }}
          >
            Register New User
          </Button>
        )}
      </Paper>
    </Box>
  );
};
