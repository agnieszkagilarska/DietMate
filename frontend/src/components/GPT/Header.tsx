import React from 'react';
import { Box, Typography } from '@mui/material';
import Logo from '../common/Logo';

const Header: React.FC = () => (
  <Box sx={{ display: 'flex', alignItems: 'center', py: 3, justifyContent: 'center', mt: -2 }}>
    <Logo />
    <Typography variant="h5" sx={{ fontWeight: 'bold', color: 'primary.main' }}>
      DIET GPT
    </Typography>
  </Box>
);

export default Header;
