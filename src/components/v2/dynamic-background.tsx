"use client";

import { motion } from "framer-motion";

export function DynamicBackground() {
  return (
    <div className="fixed inset-0 z-[-1] overflow-hidden pointer-events-none bg-[#020202]">
      {/* Glow layer */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.03),transparent_70%)]" />

      {/* Dynamic SVG Blobs mimicking Adobe Illustrator vectors */}
      <motion.svg
        viewBox="0 0 800 800"
        className="absolute top-[-10%] left-[-10%] w-[60vw] h-[60vw] opacity-10 mix-blend-screen blur-[80px]"
        animate={{
          rotate: [0, 90, 0],
          scale: [1, 1.2, 1],
        }}
        transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
      >
        <path
          fill="#FFFFFF"
          d="M485.5,233.5c73,50,131,118,127,185s-70,133-140,166s-144,33-199-2s-91-125-96-189s21-122,78-164S376,143.5,485.5,233.5z"
        />
      </motion.svg>

      <motion.svg
        viewBox="0 0 800 800"
        className="absolute bottom-[-10%] right-[-10%] w-[70vw] h-[70vw] opacity-10 mix-blend-screen blur-[100px]"
        animate={{
          rotate: [0, -90, 0],
          scale: [1, 1.3, 1],
        }}
        transition={{ duration: 25, repeat: Infinity, ease: "linear" }}
      >
        <path
          fill="#AAAAAA"
          d="M409.5,258.5c56-42,126-53,184-25s104,95,116,162s-10,134-58,181s-122,74-184,65s-112-54-150-109 s-64-120-43-176S297.5,342.5,409.5,258.5z"
        />
      </motion.svg>

      <motion.svg
        viewBox="0 0 800 800"
        className="absolute top-[30%] left-[30%] w-[40vw] h-[40vw] opacity-5 mix-blend-screen blur-[60px]"
        animate={{
          y: [0, -50, 0],
          x: [0, 50, 0],
        }}
        transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
      >
        <path
          fill="#FFFFFF"
          d="M441.5,214.5c51-40,116-56,170-36s97,76,115,142s11,142-32,203s-131,107-195,108s-104-43-138-96 s-62-115-46-170S339.5,294.5,441.5,214.5z"
        />
      </motion.svg>

      {/* Grid to give spatial depth */}
      <div 
        className="absolute inset-0 opacity-[0.03]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cpath d='M54.627 0l.83.83v58.34h-58.34l-.83-.83L0 54.628v-58.34h58.34l.83.83z' fill='none' stroke='%23FFFFFF' stroke-width='1'/%3E%3C/svg%3E")`,
          transform: "perspective(1000px) rotateX(60deg) translateY(-100px) translateZ(-200px)",
          transformOrigin: "top center",
          backgroundSize: "60px 60px",
        }}
      />
    </div>
  );
}
