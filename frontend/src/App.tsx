import React, { useState, MouseEvent, useEffect } from 'react';
import {
  createTheme,
  ThemeProvider,
  Fab,
  AppBar,
  CssBaseline,
  Menu,
  MenuItem
} from '@mui/material';
import LanguageIcon from '@mui/icons-material/Language';
import Flag from 'react-world-flags';
import { useTranslation } from 'react-i18next';
import AppRoutes from './routes/AppRoutes';
import GPT from './components/GPT/GPT';
import './i18n';
import './tailwind.css';

const App = () => {
    const [darkMode, setDarkMode] = useState<boolean>(false);
    const [anchorElLanguage, setAnchorElLanguage] = useState<null | HTMLElement>(null);
    const { i18n, t } = useTranslation();


    const handleThemeChange = (isDark: boolean): void => {
        setDarkMode(isDark);
    };

    const handleLanguageChange = (lang: string): void => {
        i18n.changeLanguage(lang);
    };

    const [sessionToken, setSessionToken] = useState<string | null>(null);

      useEffect(() => {
        const initializeSession = async () => {
          try {
             // @ts-ignore
             const domain = window.REACT_APP_DOMAIN;
             const response = await fetch(`${domain}:5000/api/session`, {
              method: 'GET',
              credentials: 'include',
              headers: {
                'Content-Type': 'application/json',
              }
            });
      
            if (!response.ok) {
              throw new Error('Failed to initialize session');
            }
      
            const data = await response.json();
            setSessionToken(data.token);
            console.log('Session initialized successfully');
          } catch (err) {
            console.error('Session initialization error:', err);
          }
        };
      
        initializeSession();

      }, []);

      const theme = createTheme({
        palette: {
          primary: {
            main: '#4CAF50'
          },
          mode: darkMode ? 'dark' : 'light',
          background: {
            default: darkMode ? '#1f1f23' : '#f0fdf4'
          }
        },
        typography: {
          fontFamily: 'Arial, sans-serif'
        }
      });

    const handleDarkModeToggle = (): void => {
        setDarkMode(!darkMode);
    };

    const handleLanguageClick = (event: MouseEvent<HTMLElement>): void => {
        setAnchorElLanguage(event.currentTarget);
    };

    const handleLanguageClose = (lang?: string): void => {
        if (lang) {
            i18n.changeLanguage(lang);
        }
        setAnchorElLanguage(null);
    };

    return (
        <ThemeProvider theme={theme}>
          <CssBaseline />
          <AppBar
            position="static"
            sx={{ backgroundColor: theme.palette.primary.main }}
          />
          <Fab
            color="primary"
            aria-label="language"
            style={{
              position: 'fixed',
              bottom: '20px',
              right: '20px',
              zIndex: 1000
            }}
            onClick={handleLanguageClick}
          >
            <LanguageIcon />
          </Fab>
          <Menu
            id="language-menu"
            anchorEl={anchorElLanguage}
            keepMounted
            open={Boolean(anchorElLanguage)}
            onClose={() => handleLanguageClose()}
          >
            <MenuItem onClick={() => handleLanguageClose('en')}>
              <Flag code="US" height="16" width="24" style={{ marginRight: 8 }} />
              {t('English')}
            </MenuItem>
            <MenuItem onClick={() => handleLanguageClose('pl')}>
              <Flag code="PL" height="16" width="24" style={{ marginRight: 8 }} />
              {t('Polish')}
            </MenuItem>
          </Menu>
          <AppRoutes />
          <GPT sessionToken={sessionToken} setSessionToken={setSessionToken} />
        </ThemeProvider>
      );
    };
    
    export default App;