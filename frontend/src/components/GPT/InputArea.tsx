import React, { useRef, useState } from 'react';
import { Box, TextField, IconButton, Typography, Paper, CircularProgress } from '@mui/material';
import SendIcon from '@mui/icons-material/Send';
import AttachFileIcon from '@mui/icons-material/AttachFile';
import RestartAltIcon from '@mui/icons-material/RestartAlt';
import InsertDriveFileIcon from '@mui/icons-material/InsertDriveFile';
import CloseIcon from '@mui/icons-material/Close';
import AlternateEmailIcon from '@mui/icons-material/AlternateEmail';
import { useTheme } from '@mui/material/styles';
import { useTranslation } from 'react-i18next';

interface InputAreaProps {
  inputText: string;
  setInputText: (text: string) => void;
  handleSendMessage: () => void;
  handleReset: () => void;
  openFileDialog: () => void;
  getRootProps: () => any;
  getInputProps: () => any;
  fileName: string;
  fileUploaded: boolean;
  handleRemoveFile: () => void;
  isGenerating?: boolean;
}

const InputArea: React.FC<InputAreaProps> = ({
  inputText,
  setInputText,
  handleSendMessage,
  handleReset,
  openFileDialog,
  getRootProps,
  getInputProps,
  fileName,
  fileUploaded,
  handleRemoveFile,
  isGenerating = false
}) => {
  const textFieldRef = useRef<HTMLInputElement | null>(null);
  const theme = useTheme();
  const { t } = useTranslation();
  const inputAreaRef = useRef(null);
  const [prefixEnabled, setPrefixEnabled] = useState(false);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let value = e.target.value;
    if (prefixEnabled && !value.startsWith('@')) {
      value = `@${value}`;
    }
    setInputText(value);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey && !isGenerating) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const togglePrefix = () => {
    setPrefixEnabled((prev) => !prev);
    if (!prefixEnabled && inputText.trim() !== '' && !inputText.startsWith('@')) {
      setInputText(`@${inputText}`);
    } else if (prefixEnabled && inputText.startsWith('@')) {
      setInputText(inputText.slice(1));
    }
  };

  return (
    <Box
      ref={inputAreaRef}
      sx={{
        display: 'flex',
        alignItems: 'flex-start',
        position: 'relative',
        width: '100%'
      }}
    >
      <Box sx={{ display: 'flex', flexDirection: 'column', mr: 1, marginTop: '-15px' }}>
        <IconButton 
          onClick={handleReset} 
          color="secondary" 
          sx={{ alignSelf: 'flex-start', ml: '-15px' }}
          disabled={isGenerating}
        >
          <RestartAltIcon />
        </IconButton>
        <IconButton 
          onClick={openFileDialog} 
          sx={{ alignSelf: 'flex-start', ml: '-15px' }}
          disabled={isGenerating}
        >
          <AttachFileIcon />
        </IconButton>
      </Box>

      {fileUploaded && (
        <Paper
          elevation={0}
          sx={{
            display: 'flex',
            alignItems: 'center',
            padding: '6px 10px',
            backgroundColor: theme.palette.background.default,
            borderRadius: 1,
            position: 'relative',
            marginTop: '10px',
            marginLeft: '-10px',
            marginRight: '10px',
            border: `1px solid ${theme.palette.divider}`,
            opacity: isGenerating ? 0.7 : 1,
          }}
        >
          <InsertDriveFileIcon sx={{ marginRight: '6px', color: theme.palette.primary.main }} />
          <Typography variant="caption" sx={{ maxWidth: '150px', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
            {fileName}
          </Typography>
          <IconButton
            onClick={handleRemoveFile}
            size="small"
            sx={{
              position: 'absolute',
              top: '-8px',
              right: '-8px',
              color: theme.palette.error.main,
              padding: '0px',
            }}
            disabled={isGenerating}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Paper>
      )}

      <Box {...getRootProps()} sx={{ flexGrow: 1, position: 'relative' }}>
        <TextField
          ref={textFieldRef}
          fullWidth
          multiline
          variant="outlined"
          value={inputText}
          onChange={handleChange}
          onKeyPress={handleKeyPress}
          placeholder={t('type_message')}
          sx={{ pr: 4 }}
          disabled={isGenerating}
        />
        <Box sx={{ position: 'absolute', right: '-16px', bottom: 8, display: 'flex', gap: 1 }}>
          <IconButton 
            onClick={togglePrefix} 
            color={prefixEnabled ? "primary" : "default"}
            disabled={isGenerating}
          >
            <AlternateEmailIcon />
          </IconButton>
          {isGenerating ? (
            <IconButton color="primary" disabled>
              <CircularProgress size={24} color="primary" />
            </IconButton>
          ) : (
            <IconButton 
              onClick={handleSendMessage} 
              color="primary"
              disabled={inputText.trim() === '' && !fileUploaded}
            >
              <SendIcon />
            </IconButton>
          )}
        </Box>
        <input {...getInputProps()} style={{ display: 'none' }} />
      </Box>
    </Box>
  );
};

export default InputArea;