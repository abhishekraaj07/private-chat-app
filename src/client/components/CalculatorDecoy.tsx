/**
 * NEXUS Camouflage Calculator Decoy (Stealth Mode)
 *
 * Full-screen, fully interactive decoy calculator overlay.
 * Disguises the active ephemeral chat room behind a convincing
 * dark terminal engineering calculator.
 *
 * Covert exits:
 * - Entering secret unlock code (default: 1337 or room code) followed by '='
 * - Clicking the discreet subtle indicator in the top corner
 * - Pressing Esc or Ctrl+Alt+C
 */

import React, { useState, useEffect, useCallback } from 'react';
import { Eye, Shield, Delete } from 'lucide-react';

interface CalculatorDecoyProps {
  isOpen: boolean;
  roomCode?: string;
  onUnlock: () => void;
}

export const CalculatorDecoy: React.FC<CalculatorDecoyProps> = ({
  isOpen,
  roomCode,
  onUnlock,
}) => {
  const [display, setDisplay] = useState('0');
  const [prevValue, setPrevValue] = useState<number | null>(null);
  const [operator, setOperator] = useState<string | null>(null);
  const [waitingForOperand, setWaitingForOperand] = useState(false);
  const [statusMessage, setStatusMessage] = useState('DEG • READY');

  // Normalized room code for stealth unlock check
  const normalizedRoomCode = roomCode ? roomCode.replace(/-/g, '').toLowerCase() : '';

  const checkUnlock = useCallback(
    (val: string) => {
      const clean = val.replace(/\s/g, '').toLowerCase();
      if (clean === '1337' || (normalizedRoomCode && clean === normalizedRoomCode)) {
        onUnlock();
        return true;
      }
      return false;
    },
    [normalizedRoomCode, onUnlock]
  );

  const inputDigit = useCallback((digit: string) => {
    setDisplay((prev) => {
      if (waitingForOperand || prev === '0') {
        setWaitingForOperand(false);
        return digit;
      }
      return prev.length < 14 ? prev + digit : prev;
    });
  }, [waitingForOperand]);

  const inputDecimal = useCallback(() => {
    setDisplay((prev) => {
      if (waitingForOperand) {
        setWaitingForOperand(false);
        return '0.';
      }
      if (!prev.includes('.')) {
        return prev + '.';
      }
      return prev;
    });
  }, [waitingForOperand]);

  const clearAll = useCallback(() => {
    setDisplay('0');
    setPrevValue(null);
    setOperator(null);
    setWaitingForOperand(false);
    setStatusMessage('DEG • CLEARED');
  }, []);

  const performOperation = useCallback((nextOperator: string) => {
    const inputValue = parseFloat(display);

    if (prevValue === null) {
      setPrevValue(inputValue);
    } else if (operator) {
      const currentValue = prevValue || 0;
      let newValue = currentValue;

      if (operator === '+') newValue = currentValue + inputValue;
      else if (operator === '-') newValue = currentValue - inputValue;
      else if (operator === '×' || operator === '*') newValue = currentValue * inputValue;
      else if (operator === '÷' || operator === '/') {
        newValue = inputValue !== 0 ? currentValue / inputValue : 0;
      }

      setPrevValue(newValue);
      setDisplay(String(Number(newValue.toFixed(8))));
    }

    setWaitingForOperand(true);
    setOperator(nextOperator);
  }, [display, prevValue, operator]);

  const handleEquals = useCallback(() => {
    // Check if current display triggers stealth unlock
    if (checkUnlock(display)) {
      return;
    }

    if (operator && prevValue !== null) {
      const inputValue = parseFloat(display);
      let newValue = prevValue;

      if (operator === '+') newValue = prevValue + inputValue;
      else if (operator === '-') newValue = prevValue - inputValue;
      else if (operator === '×' || operator === '*') newValue = prevValue * inputValue;
      else if (operator === '÷' || operator === '/') {
        newValue = inputValue !== 0 ? prevValue / inputValue : 0;
      }

      setDisplay(String(Number(newValue.toFixed(8))));
      setPrevValue(null);
      setOperator(null);
      setWaitingForOperand(true);
      setStatusMessage('DEG • RESULT');
    }
  }, [display, operator, prevValue, checkUnlock]);

  // Keyboard navigation for calculator
  useEffect(() => {
    if (!isOpen) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.ctrlKey && e.altKey && e.key.toLowerCase() === 'c') {
        e.preventDefault();
        onUnlock();
        return;
      }
      if (e.key === 'Escape') {
        e.preventDefault();
        clearAll();
        return;
      }

      if (/[0-9]/.test(e.key)) {
        e.preventDefault();
        inputDigit(e.key);
      } else if (e.key === '.') {
        e.preventDefault();
        inputDecimal();
      } else if (e.key === '+' || e.key === '-') {
        e.preventDefault();
        performOperation(e.key);
      } else if (e.key === '*') {
        e.preventDefault();
        performOperation('×');
      } else if (e.key === '/') {
        e.preventDefault();
        performOperation('÷');
      } else if (e.key === 'Enter' || e.key === '=') {
        e.preventDefault();
        handleEquals();
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        setDisplay((prev) => (prev.length > 1 ? prev.slice(0, -1) : '0'));
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, inputDigit, inputDecimal, performOperation, handleEquals, clearAll, onUnlock]);

  if (!isOpen) return null;

  return (
    <div
      id="calculator-decoy-overlay"
      className="fixed inset-0 z-50 flex items-center justify-center bg-[#08090B] text-[#EDEDED] p-4 select-none animate-in fade-in duration-100"
    >
      <div className="w-full max-w-xs sm:max-w-sm bg-[#0D0F12] border border-[#1F242D] rounded-2xl shadow-2xl p-5 flex flex-col gap-4">
        {/* Title / Brand Header */}
        <div className="flex items-center justify-between border-b border-[#1F242D] pb-3 text-xs font-mono text-[#8A909E]">
          <div className="flex items-center gap-1.5">
            <span className="font-semibold text-[#EDEDED] tracking-wider">CASIO</span>
            <span className="text-[10px] text-[#606775]">fx-991EX</span>
          </div>
          <button
            type="button"
            onClick={onUnlock}
            title="Exit Stealth Mode"
            className="opacity-20 hover:opacity-100 transition-opacity p-1 text-[#8A909E] hover:text-[#38BDF8]"
          >
            <Eye className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* LCD Screen Display */}
        <div className="bg-[#11161D] border border-[#1F242D] rounded-xl p-3.5 flex flex-col items-end justify-between shadow-inner h-24">
          <div className="w-full flex items-center justify-between text-[10px] font-mono text-[#606775]">
            <span>{statusMessage}</span>
            {operator && <span>{operator}</span>}
          </div>
          <div className="font-mono text-3xl sm:text-4xl font-bold tracking-tight text-[#EDEDED] overflow-x-auto max-w-full text-right">
            {display}
          </div>
        </div>

        {/* Keypad Grid */}
        <div className="grid grid-cols-4 gap-2 text-sm font-mono font-medium">
          {/* Row 1 */}
          <button
            type="button"
            onClick={clearAll}
            className="p-3 bg-[#1C1418] hover:bg-[#2A1820] text-rose-400 border border-rose-900/40 rounded-xl transition-colors active:scale-95"
          >
            AC
          </button>
          <button
            type="button"
            onClick={() => setDisplay((prev) => (prev.startsWith('-') ? prev.slice(1) : '-' + prev))}
            className="p-3 bg-[#161922] hover:bg-[#1F242D] text-[#8A909E] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            ±
          </button>
          <button
            type="button"
            onClick={() => {
              const val = parseFloat(display) / 100;
              setDisplay(String(val));
            }}
            className="p-3 bg-[#161922] hover:bg-[#1F242D] text-[#8A909E] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            %
          </button>
          <button
            type="button"
            onClick={() => performOperation('÷')}
            className={`p-3 rounded-xl border transition-colors active:scale-95 ${
              operator === '÷'
                ? 'bg-[#38BDF8] text-[#08090B] border-[#38BDF8] font-bold'
                : 'bg-[#161922] hover:bg-[#1F242D] text-[#38BDF8] border-[#1F242D]'
            }`}
          >
            ÷
          </button>

          {/* Row 2 */}
          <button
            type="button"
            onClick={() => inputDigit('7')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            7
          </button>
          <button
            type="button"
            onClick={() => inputDigit('8')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            8
          </button>
          <button
            type="button"
            onClick={() => inputDigit('9')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            9
          </button>
          <button
            type="button"
            onClick={() => performOperation('×')}
            className={`p-3 rounded-xl border transition-colors active:scale-95 ${
              operator === '×'
                ? 'bg-[#38BDF8] text-[#08090B] border-[#38BDF8] font-bold'
                : 'bg-[#161922] hover:bg-[#1F242D] text-[#38BDF8] border-[#1F242D]'
            }`}
          >
            ×
          </button>

          {/* Row 3 */}
          <button
            type="button"
            onClick={() => inputDigit('4')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            4
          </button>
          <button
            type="button"
            onClick={() => inputDigit('5')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            5
          </button>
          <button
            type="button"
            onClick={() => inputDigit('6')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            6
          </button>
          <button
            type="button"
            onClick={() => performOperation('-')}
            className={`p-3 rounded-xl border transition-colors active:scale-95 ${
              operator === '-'
                ? 'bg-[#38BDF8] text-[#08090B] border-[#38BDF8] font-bold'
                : 'bg-[#161922] hover:bg-[#1F242D] text-[#38BDF8] border-[#1F242D]'
            }`}
          >
            -
          </button>

          {/* Row 4 */}
          <button
            type="button"
            onClick={() => inputDigit('1')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            1
          </button>
          <button
            type="button"
            onClick={() => inputDigit('2')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            2
          </button>
          <button
            type="button"
            onClick={() => inputDigit('3')}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            3
          </button>
          <button
            type="button"
            onClick={() => performOperation('+')}
            className={`p-3 rounded-xl border transition-colors active:scale-95 ${
              operator === '+'
                ? 'bg-[#38BDF8] text-[#08090B] border-[#38BDF8] font-bold'
                : 'bg-[#161922] hover:bg-[#1F242D] text-[#38BDF8] border-[#1F242D]'
            }`}
          >
            +
          </button>

          {/* Row 5 */}
          <button
            type="button"
            onClick={() => inputDigit('0')}
            className="col-span-2 p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95 text-left pl-5"
          >
            0
          </button>
          <button
            type="button"
            onClick={inputDecimal}
            className="p-3.5 bg-[#111318] hover:bg-[#1A1D24] text-[#EDEDED] border border-[#1F242D] rounded-xl transition-colors active:scale-95"
          >
            .
          </button>
          <button
            type="button"
            onClick={handleEquals}
            className="p-3.5 bg-[#38BDF8] hover:bg-[#0284C7] text-[#08090B] font-bold rounded-xl transition-colors active:scale-95 shadow-md shadow-[#38BDF8]/20"
          >
            =
          </button>
        </div>

        {/* Covert hint footer */}
        <div className="text-[10px] font-mono text-center text-[#404756]">
          SOLAR POWERED • TWO-WAY POWER SYSTEM
        </div>
      </div>
    </div>
  );
};
