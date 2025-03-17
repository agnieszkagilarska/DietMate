import React, { useEffect, useState } from 'react';
import appleIcon from '../../assets/apple.png';
import bananaIcon from '../../assets/grape.png';
import cheeseIcon from '../../assets/cheese.png';
import avocadoIcon from '../../assets/avocado.png';
import beansIcon from '../../assets/beans.png';
import pistachioIcon from '../../assets/pistachio.png';
import pumpkinIcon from '../../assets/pumpkin.png';
import spinachIcon from '../../assets/spinach.png';
import chiliIcon from '../../assets/chili.png';
import cornIcon from '../../assets/corn.png';
import matchaIcon from '../../assets/matcha.png';
import plumIcon from '../../assets/plum.png';
import wallnutIcon from '../../assets/wallnut.png';
import watermelonIcon from '../../assets/watermelon.png';

const ICON_URLS = [appleIcon, bananaIcon, cheeseIcon, avocadoIcon, beansIcon, pistachioIcon, pumpkinIcon, spinachIcon, chiliIcon, cornIcon, matchaIcon, plumIcon,wallnutIcon, watermelonIcon];

interface IconProps {
  id: number;
  url: string;
  size: number;
  left: number;
  delay: number;
  duration: number;
  rotationSpeed: number;
  swayAmount: number;
}

const ConfettiIcons: React.FC = () => {
  const [iconData, setIconData] = useState<IconProps[]>([]);
  
  useEffect(() => {
    const numIcons = 12; // Using more icons to ensure all types are represented
    
    const data = Array(numIcons).fill(null).map((_, idx) => {
      // Ensure we use all icon types by cycling through them
      const iconIndex = idx % ICON_URLS.length;
      const url = ICON_URLS[iconIndex];
      
      // Distribute icons across the width
      const left = Math.random() * 90;
      
      // Create variation in falling speed and behavior
      const delay = Math.random() * 12; // Staggered delays up to 12s
      const duration = 10 + Math.random() * 8; // 10-18 seconds
      const size = 35 + Math.random() * 20; // 35-55px
      const rotationSpeed = Math.random() > 0.5 ? 
        3 + Math.random() * 4 : // Slower rotation: 3-7s
        1 + Math.random() * 2;  // Faster rotation: 1-3s
      const swayAmount = 5 + Math.random() * 15; // 5-20px horizontal sway
      
      return { 
        id: idx, 
        url, 
        size, 
        left, 
        delay, 
        duration, 
        rotationSpeed,
        swayAmount
      };
    });
    
    setIconData(data);
  }, []);

  return (
    <div
      className="absolute inset-0 pointer-events-none overflow-hidden"
      aria-hidden="true"
    >
      {iconData.map(icon => (
        <img
          key={icon.id}
          src={icon.url}
          alt=""
          className="absolute animate-fall"
          style={{
            width: icon.size,
            height: icon.size,
            left: `${icon.left}%`,
            top: '-10%',
            animationDelay: `${icon.delay}s`,
            animationDuration: `${icon.duration}s`,
            '--sway-amount': `${icon.swayAmount}px`,
            '--rotation-duration': `${icon.rotationSpeed}s`,
          } as React.CSSProperties}
        />
      ))}
    </div>
  );
};

export default ConfettiIcons;