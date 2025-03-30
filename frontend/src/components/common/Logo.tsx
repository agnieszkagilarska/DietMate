import React from 'react';

const Logo = () => {
  return (
    <svg
      className="h-8 w-8 text-primary-600"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="2"
    >
      <path
        strokeLinecap="round"
        strokeLinejoin="round"
        d="M20 7l-8-4-8 4m16 0l-8 4m-8-4l8 4m8 8l-8 4m-8-4l8 4m-8-4v-8m16 0v8"
      />
    </svg>
  );
};

export default Logo;
