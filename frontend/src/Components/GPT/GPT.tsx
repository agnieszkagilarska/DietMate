import React, { useState, useCallback, useEffect, useRef } from 'react';
import { Drawer, Box, Typography, Snackbar } from '@mui/material';
import { useDropzone } from 'react-dropzone';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

// @ts-ignore
import logo from '../../img/logo.png';

import DrawerToggle from './DrawerToggle';
import MessageList from './MessageList';
import InputArea from './InputArea';
import Header from "./Header";
import WelcomeMessage from './WelcomeMessage';

interface GPTProps {
  sessionToken: string;
  setSessionToken: (sessionToken: string) => void;
}

interface ConversationMessage {
  type: 'user' | 'bot';
  content: string;
  alert?: boolean;
  task?: boolean;
}

const GPT: React.FC<GPTProps> = ({ sessionToken, setSessionToken }) => {
  const { t, i18n } = useTranslation();
  const [open, setOpen] = useState<boolean>(false);
  const [inputText, setInputText] = useState<string>('');
  const [fileName, setFileName] = useState<string>('');
  const [fileContent, setFileContent] = useState<string>('');
  const [fileUploaded, setFileUploaded] = useState<boolean>(false);
  const [conversation, setConversation] = useState<ConversationMessage[]>([]);
  const [snackbarOpen, setSnackbarOpen] = useState<boolean>(false);
  const conversationEndRef = useRef<HTMLDivElement | null>(null);
  const theme = useTheme();

  const toggleDrawer = () => {
    setOpen(!open);
  };

  const handleRemoveFile = useCallback(() => {
    setFileName('');
    setFileContent('');
    setFileUploaded(false);
    console.log('file_removed');
  }, []);

  const handleSendMessage = () => {
    if (inputText.trim() !== '' || fileName) {
      const userMessage = fileName
        ? `${inputText.trim()}\n\n[${t('uploaded_file')}: ${fileName}]`
        : inputText.trim();

      setConversation(prev => [...prev, { type: 'user', content: userMessage }]);

      fetchFromServer(inputText.trim(), fileName, fileContent);

      setInputText('');
      setFileName('');
      setFileContent('');
      setFileUploaded(false);
    }
  };

  const handleCopyCode = (code: string) => {
    navigator.clipboard.writeText(code)
      .then(() => {
        setSnackbarOpen(true);
      })
      .catch((err) => {
        console.error('failed_to_copy', err);
      });
  };

  const handleReset = useCallback(() => {
    setConversation([]);
    setInputText('');
    setFileName('');
    setFileContent('');
    setFileUploaded(false);
  
    const resetSession = async () => {
      try {
      // @ts-ignore
      const domain = window.REACT_APP_DOMAIN;
        const response = await fetch(`${domain}:5000/api/session`, {
          method: 'GET',
          credentials: 'include',
          headers: {
            'Content-Type': 'application/json',
          },
        });
  
        if (!response.ok) {
          throw new Error('Failed to reset session');
        }
  
        const data = await response.json();
        setSessionToken(data.token);
      } catch (err) {
        console.error('Session reset error:', err);
      }
    };
    resetSession();
  
    console.log('Conversation reset');
  }, [setSessionToken]);

  const onDrop = useCallback((acceptedFiles: File[]) => {
    const file = acceptedFiles[0];
    const reader = new FileReader();

    reader.onabort = () => console.log("file_reading_aborted");
    reader.onerror = () => console.log("file_reading_failed");
    reader.onload = () => {
      const content = reader.result;
      setFileName(file.name);
      setFileContent(content as string);
      setFileUploaded(true);
    };

    if (file.type.match(/text|csv|json|xml|html|excel|spreadsheet|plain/)) {
      reader.readAsText(file);
    } else {
      alert(t('upload_valid_file'));
    }
  }, [t]);

  const { getRootProps, getInputProps, open: openFileDialog } = useDropzone({
    onDrop,
    noClick: true,
    noKeyboard: true,
    maxFiles: 1,
    accept: {
      'text/csv': ['.csv'],
      'application/json': ['.json'],
      'application/xml': ['.xml'],
      'text/html': ['.html'],
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['.xlsx'],
      'application/vnd.ms-excel': ['.xls'],
      'text/plain': ['.txt'],
    },
  });

  const fetchFromServer = async (prompt: string, fileName: string, fileContent: string) => {
    try {
      // @ts-ignore
      const domain = window.REACT_APP_DOMAIN;
      const response = await fetch(`${domain}:5000/api/askGPT`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${sessionToken}`
        },
        body: JSON.stringify({
          message: prompt,
          fileName: fileName,
          fileContent: fileContent,
        }),
      });

      if (response.status === 429) {
        const errorData = await response.json();
        const errorMessage = t('rate_limit_exceeded', { retry_after: errorData.retry_after });
        setConversation(prev => [...prev, {
          type: 'bot',
          content: errorMessage,
          alert: true
        }]);
        return;
      }

      if (response.status === 401) {
        const errorData = await response.json();
        if (errorData.message === "Invalid or expired token") {
          setSessionToken('');
        setConversation(prev => [...prev, {
        type: 'bot',
        content: t('invalid_or_expired_token'),
        alert: true
          }]);
          return;
        }
      }

      if (!response || !response.body) {
        const errorMessage = t('errorMessage');
        setConversation(prev => [...prev, {
          type: 'bot',
          content: errorMessage,
          alert: true
        }]);
        return;
      }


      const reader = response.body.getReader();
      const decoder = new TextDecoder("utf-8");
      let botMessage = '';
      const botMessagePlaceholder = { type: 'bot', content: '' };
      setConversation((prev: any) => [...prev, botMessagePlaceholder]);

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        botMessage += chunk;

        const containsError = botMessage.includes("***ERROR***:");
        setConversation(prev => {
          const updatedConversation = [...prev];
          if (containsError) {
            const errorMessage = botMessage.split("***ERROR***:")[1].trim();
            updatedConversation[updatedConversation.length - 1] = {
              type: 'bot',
              content: errorMessage,
              alert: true
            };
          } else {
            updatedConversation[updatedConversation.length - 1] = {
              type: 'bot',
              content: botMessage,
              alert: botMessage.includes("***ERROR***")
            };
          }
          return updatedConversation;
        });

        if (containsError) break;
      }
    } catch (error) {
      console.error('error_fetching_data', error);
      const errorMessage = {
        type: 'bot',
        content: t('failed_to_fetch_data'),
        alert: true
      };
      setConversation((prev: any) => [...prev, errorMessage]);
    }
  };
  useEffect(() => {
    const scrollTimeout = setTimeout(() => {
      if (conversationEndRef.current) {
        conversationEndRef.current.scrollIntoView({ behavior: 'smooth' });
      }
    }, 10);

    return () => clearTimeout(scrollTimeout);
  }, [conversation]);

  return (
    <>
      <WelcomeMessage setConversation={setConversation}/>
      <DrawerToggle open={open} toggleDrawer={toggleDrawer} />
      <Drawer
        anchor="left"
        open={open}
        onClose={toggleDrawer}
        PaperProps={{
          sx: {
        width: '600px',
        borderTopRightRadius: '20px',
        borderBottomRightRadius: '20px',
        backgroundColor: theme.palette.background.default,
        color: theme.palette.primary.main,
        overflowX: 'hidden',
          },
        }}
      >
        <Box sx={{ padding: '15px', height: '100%', display: 'flex', flexDirection: 'column' }}>
          <Header logo={logo} />
          <MessageList
            conversation={conversation}
            conversationEndRef={conversationEndRef}
            handleCopyCode={handleCopyCode}
          />
          <InputArea
            inputText={inputText}
            setInputText={setInputText}
            handleSendMessage={handleSendMessage}
            handleReset={handleReset}
            openFileDialog={openFileDialog}
            getRootProps={getRootProps}
            getInputProps={getInputProps}
            fileName={fileName}
            fileUploaded={fileUploaded}
            handleRemoveFile={handleRemoveFile}
          />
          <Typography variant="caption" sx={{ textAlign: 'center', color: 'text.secondary' }}>
            {t('gpt_disclaimer')}
          </Typography>
        </Box>
      </Drawer>
      <Snackbar
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
        open={snackbarOpen}
        autoHideDuration={2000}
        onClose={() => setSnackbarOpen(false)}
        message={t('code_copied_to_clipboard')}
      />
    </>
  );
};

export default GPT;