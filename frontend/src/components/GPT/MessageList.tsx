import React from 'react';
import { Box, Typography, Avatar, IconButton, CircularProgress } from '@mui/material';
import HealingIcon from '@mui/icons-material/Healing';
import ContentCopyIcon from '@mui/icons-material/ContentCopy';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vs } from 'react-syntax-highlighter/dist/esm/styles/prism';
import formatMessageContent from "../../Utils/formatMessageContent";
import { useTranslation } from 'react-i18next';

interface Message {
  type: 'user' | 'bot';
  content: string;
  alert?: boolean;
  task?: boolean;
  isGenerating?: boolean;
}

interface MessageListProps {
  conversation: Message[];
  conversationEndRef: React.RefObject<HTMLDivElement>;
  handleCopyCode: (code: string) => void;
}

const MessageList: React.FC<MessageListProps> = ({
  conversation,
  conversationEndRef,
  handleCopyCode
}) => {
  const { t } = useTranslation();

  const renderMessage = (message: Message, index: number) => {
    const codeBlockRegex = /```(\w+)?\n([\s\S]*?)```/g;
    const parts: { type: 'text' | 'code'; content: string; language?: string }[] = [];
    let lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = codeBlockRegex.exec(message.content)) !== null) {
      if (match.index > lastIndex) {
        parts.push({
          type: 'text',
          content: message.content.slice(lastIndex, match.index).trim()
        });
      }
      parts.push({
        type: 'code',
        language: match[1] || 'text',
        content: match[2].trim()
      });
      lastIndex = match.index + match[0].length;
    }

    if (lastIndex < message.content.length) {
      parts.push({
        type: 'text',
        content: message.content.slice(lastIndex).trim()
      });
    }

    return (
      <Box
        key={index}
        sx={{
          display: 'flex',
          mb: 2,
          alignItems: 'flex-start',
          justifyContent: message.type === 'user' ? 'flex-end' : 'flex-start'
        }}
      >
        {message.type === 'bot' && (
          <Avatar sx={{ width: '30px', height: '30px', mr: 1, bgcolor: 'primary.main' }} />
        )}

        <Box sx={{
          flexGrow: 1,
          maxWidth: '85%',
          ml: message.type === 'user' ? 'auto' : 0,
          mr: message.type === 'user' ? 0 : 'auto',
        }}>
          {message.type === 'bot' && message.isGenerating && (
            <Box sx={{ display: 'flex', alignItems: 'center', mb: 1, opacity: 0.5, backgroundColor: 'grey.100', p: 1.5, borderRadius: 3, border: '1px solid rgba(0, 0, 0, 0.12)' }}>
              <CircularProgress size={20} sx={{ mr: 1 }} />
              <Typography variant="body2">{t('generating')}</Typography>
            </Box>
          )}
          
          {parts.map((part, partIndex) => (
            part.type === 'code' ? (
              <Box key={partIndex} sx={{ position: 'relative', width: '100%', mb: 1 }}>
                <IconButton
                  onClick={() => handleCopyCode(part.content)}
                  sx={{ position: 'absolute', top: 5, right: 5, color: 'white', backgroundColor: 'rgba(0,0,0,0.3)', '&:hover': { backgroundColor: 'rgba(0,0,0,0.5)' } }}
                >
                  <ContentCopyIcon fontSize="small" />
                </IconButton>
                <SyntaxHighlighter
                  language={part.language}
                  style={vs}
                  customStyle={{ margin: 0, borderRadius: '4px', maxWidth: '100%', backgroundColor: '#F8F8F8' }}
                >
                  {part.content}
                </SyntaxHighlighter>
              </Box>
            ) : (
              <Typography
                key={partIndex}
                sx={{
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  backgroundColor: message.type === 'user' ? 'grey.300' : 'grey.100',
                  color: message.alert ? '#CD5C5C' : message.task ? '#5d8a94' : 'black',
                  fontWeight: message.alert ? 'bold' : 'normal',
                  p: 2,
                  borderRadius: 3,
                  border: '1px solid rgba(0, 0, 0, 0.12)',
                  maxWidth: '100%',
                  mb: 1,
                }}
                dangerouslySetInnerHTML={{
                  __html: formatMessageContent(part.content)
                }}
              />
            )
          ))}
        </Box>

        {message.type === 'user' && (
          <Avatar sx={{ width: '30px', height: '30px', ml: 1, bgcolor: 'secondary.main' }}>
            <HealingIcon fontSize="small" />
          </Avatar>
        )}
      </Box>
    );
  };

  return (
    <Box sx={{ flexGrow: 1, overflowY: 'auto', mb: 2 }}>
      {conversation.map((message, index) => renderMessage(message, index))}
      <div ref={conversationEndRef} />
    </Box>
  );
};

export default MessageList;