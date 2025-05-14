import React from 'react';
import { Box, Typography, Link, Container } from '@mui/material';
import EmailIcon from '@mui/icons-material/Email';
import { Link as RouterLink } from 'react-router-dom';

const Footer = () => {
  return (
    <Box
      component="footer"
      sx={{
        py: 3,
        px: 2,
        mt: 'auto',
        backgroundColor: '#5E58D5',
        borderTop: '1px solid #eaeaea',
      }}
    >
      <Container maxWidth="lg">
        <Box
          sx={{
            display: 'flex',
            flexDirection: 'column',
            gap: 2,
          }}
        >
          {/* About Us Section */}
          <Box sx={{ mb: 2 }}>
            <Typography variant="subtitle2" sx={{ color: 'white', mb: 1 }}>
              About Us
            </Typography>
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)', maxWidth: '600px' }}>
              Launched in 2025, FitTrack is a fitness tracker and helper using AI to give you the best plans for your specific needs.
            </Typography>
          </Box>

          {/* Footer Bottom */}
          <Box
            sx={{
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              flexWrap: 'wrap',
              borderTop: '1px solid rgba(255, 255, 255, 0.1)',
              pt: 2,
            }}
          >
            <Typography variant="body2" sx={{ color: 'rgba(255, 255, 255, 0.8)' }}>
              © {new Date().getFullYear()} FitTrack. All rights reserved.
            </Typography>
            
            <Box sx={{ display: 'flex', gap: 3, alignItems: 'center' }}>
              <Link
                component={RouterLink}
                to="/contact-support"
                sx={{
                  display: 'flex',
                  alignItems: 'center',
                  gap: 1,
                  color: 'rgba(255, 255, 255, 0.8)',
                  textDecoration: 'none',
                  '&:hover': { color: 'white' }
                }}
              >
                <EmailIcon fontSize="small" />
                <Typography variant="body2">Contact Support</Typography>
              </Link>
            </Box>
          </Box>
        </Box>
      </Container>
    </Box>
  );
};

export default Footer;