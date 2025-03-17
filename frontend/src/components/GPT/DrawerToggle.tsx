import React from 'react';
import ArrowForwardIosIcon from '@mui/icons-material/ArrowForwardIos';

interface DrawerToggleProps {
  open: boolean;
  toggleDrawer: () => void;
}

const DrawerToggle: React.FC<DrawerToggleProps> = ({ open, toggleDrawer }) => {

  if (open) return null;

  const leftPosition: string = open ? '580px' : '0px';
  const borderRadius: string = open ? '100px 0 0 100px' : '0 100px 100px 0';

  const toggleStyle: React.CSSProperties = {
    position: 'fixed',
    top: '50%',
    left: leftPosition,
    transform: 'translateY(-50%)',
    width: '20px',
    height: '80px',
    backgroundColor: 'black',
    borderRadius: borderRadius,
    cursor: 'pointer',
    zIndex: 1300,
    transition: 'left 0.3s ease, right 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
  };

  const iconWrapperStyle: React.CSSProperties = {
    color: 'white',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    width: '100%',
    height: '100%',
    transform: open ? 'rotate(180deg)' : 'none',
    transition: 'transform 0.3s ease',
  };

  return (
    <div data-testid="drawer-toggle" onClick={toggleDrawer} style={toggleStyle}>
      <div style={iconWrapperStyle}>
        <ArrowForwardIosIcon />
      </div>
    </div>
  );
};

export default DrawerToggle;
