import React from 'react';
import { FiGithub, FiLinkedin, FiTwitter, FiMail } from 'react-icons/fi';

function Footer() {
    const currentYear = new Date().getFullYear();

  return (
    <footer
        className="w-full py-2 px-4 sm:px-8 bg-opacity-50 text-gray-400 text-sm font-[family-name:var(--font-geist-mono)] border-t border-gray-800 mt-auto"
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex gap-5">
            <a
              href="https://github.com/darrancebeh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Profile"
              className="transition-colors duration-300 hover:text-gray-200"
            >
              <FiGithub className="w-5 h-5" />
            </a>
            <a
              href="https://linkedin.com/in/darrancebeh"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Profile"
              className="transition-colors duration-300 hover:text-gray-200"
            >
              <FiLinkedin className="w-5 h-5" />
            </a>
            <a
              href="https://x.com/quant_in_my"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="X Profile"
              className="transition-colors duration-300 hover:text-gray-200"
            >
              <FiTwitter className="w-5 h-5" />
            </a>
            <a
              href="mailto:darrancebeh@gmail.com"
              aria-label="Send Email"
              className="transition-colors duration-300 hover:text-gray-200"
            >
              <FiMail className="w-5 h-5" />
            </a>
          </div>

          <div className="text-center sm:text-right">
            <p>&copy; {currentYear} Darrance Beh Heng Shek. All Rights Reserved.</p>
            <p className="text-xs text-gray-500 mt-1">
              Built with Next.js, React, Typescript, and Tailwind CSS.
            </p>
          </div>
        </div>
      </footer>
  );
}

export default Footer;
