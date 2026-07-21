import React, { useState, useRef, useEffect } from 'react';
import { FiCalendar, FiChevronLeft, FiChevronRight } from 'react-icons/fi';

const DateRangePicker = ({ startDate, endDate, onApply, onClear }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [currentMonth, setCurrentMonth] = useState(new Date()); // viewed month
  const [tempStart, setTempStart] = useState(startDate ? new Date(startDate) : null);
  const [tempEnd, setTempEnd] = useState(endDate ? new Date(endDate) : null);
  const containerRef = useRef(null);

  // Sync state with props when dashboard parameters are reset
  useEffect(() => {
    setTempStart(startDate ? new Date(startDate) : null);
    setTempEnd(endDate ? new Date(endDate) : null);
  }, [startDate, endDate]);

  // Click outside to close
  useEffect(() => {
    const handleOutsideClick = (e) => {
      if (containerRef.current && !containerRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleOutsideClick);
    return () => document.removeEventListener('mousedown', handleOutsideClick);
  }, []);

  const getDaysInMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month + 1, 0).getDate();
  };

  const getFirstDayOfMonth = (date) => {
    const year = date.getFullYear();
    const month = date.getMonth();
    return new Date(year, month, 1).getDay();
  };

  const handlePrevMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentMonth(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1));
  };

  const formatDateString = (date) => {
    if (!date) return '';
    const y = date.getFullYear();
    const m = String(date.getMonth() + 1).padStart(2, '0');
    const d = String(date.getDate()).padStart(2, '0');
    return `${y}-${m}-${d}`;
  };

  const handleDayClick = (dayNum) => {
    const clickedDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), dayNum);
    
    if (!tempStart || (tempStart && tempEnd)) {
      setTempStart(clickedDate);
      setTempEnd(null);
    } else if (tempStart && !tempEnd) {
      if (clickedDate < tempStart) {
        setTempStart(clickedDate);
      } else {
        setTempEnd(clickedDate);
      }
    }
  };

  const handleApply = () => {
    if (tempStart && tempEnd) {
      onApply(formatDateString(tempStart), formatDateString(tempEnd));
      setIsOpen(false);
    } else {
      alert("Please select both a start date and an end date on the calendar.");
    }
  };

  const handleClear = () => {
    setTempStart(null);
    setTempEnd(null);
    onClear();
    setIsOpen(false);
  };

  const applyPreset = (daysOffset) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysOffset);
    onApply(formatDateString(start), formatDateString(end));
    setIsOpen(false);
  };

  const applyYesterday = () => {
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    onApply(formatDateString(yesterday), formatDateString(yesterday));
    setIsOpen(false);
  };

  const renderDays = () => {
    const daysInMonth = getDaysInMonth(currentMonth);
    const firstDayIndex = getFirstDayOfMonth(currentMonth);
    const dayElements = [];

    // Fills empty grid slots for days before the 1st of the month
    for (let i = 0; i < firstDayIndex; i++) {
      dayElements.push(<div key={`empty-${i}`} className="p-2" />);
    }

    // Fills month days
    for (let day = 1; day <= daysInMonth; day++) {
      const thisDate = new Date(currentMonth.getFullYear(), currentMonth.getMonth(), day);
      
      const isStart = tempStart && formatDateString(thisDate) === formatDateString(tempStart);
      const isEnd = tempEnd && formatDateString(thisDate) === formatDateString(tempEnd);
      const isInRange = tempStart && tempEnd && thisDate > tempStart && thisDate < tempEnd;

      let btnClass = "text-text hover:bg-primary/20 rounded-xl transition-all font-semibold";
      if (isStart || isEnd) {
        btnClass = "bg-primary text-white font-extrabold rounded-xl transition-all scale-105 shadow-sm";
      } else if (isInRange) {
        btnClass = "bg-primary/10 text-primary hover:bg-primary/30 rounded-lg transition-all";
      }

      dayElements.push(
        <button
          key={`day-${day}`}
          onClick={() => handleDayClick(day)}
          className={`p-2 w-9 h-9 text-xs flex items-center justify-center cursor-pointer ${btnClass}`}
        >
          {day}
        </button>
      );
    }

    return dayElements;
  };

  const months = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
  const monthName = months[currentMonth.getMonth()];
  const year = currentMonth.getFullYear();

  return (
    <div className="relative" ref={containerRef}>
      {/* Date Toggle Trigger Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="flex items-center gap-2 bg-bg border border-border px-4 py-2 rounded-xl text-xs text-text font-bold hover:border-primary transition cursor-pointer select-none shadow-sm"
      >
        <FiCalendar className="text-primary text-sm" />
        <span>
          {startDate && endDate ? `${startDate} to ${endDate}` : 'Custom Date Range'}
        </span>
      </button>

      {/* Dropdown Calendar Panel */}
      {isOpen && (
        <div className="absolute right-0 mt-2 bg-card border border-border p-4 rounded-2xl shadow-xl w-[290px] sm:w-[420px] z-50 flex flex-col sm:flex-row gap-4 animate-fadeIn">
          {/* Quick presets sidebar */}
          <div className="flex flex-row sm:flex-col gap-1.5 border-b sm:border-b-0 sm:border-r border-border pb-2.5 sm:pb-0 sm:pr-3 min-w-[100px] justify-between sm:justify-start">
            <span className="hidden sm:block text-[9px] text-gray-400 font-bold uppercase tracking-wider mb-2">Presets</span>
            <button
              onClick={() => applyPreset(0)}
              className="text-left text-xs font-bold text-gray-400 hover:text-primary transition py-1 px-2 hover:bg-primary/5 rounded-lg w-full cursor-pointer"
            >
              Today
            </button>
            <button
              onClick={applyYesterday}
              className="text-left text-xs font-bold text-gray-400 hover:text-primary transition py-1 px-2 hover:bg-primary/5 rounded-lg w-full cursor-pointer"
            >
              Yesterday
            </button>
            <button
              onClick={() => applyPreset(6)}
              className="text-left text-xs font-bold text-gray-400 hover:text-primary transition py-1 px-2 hover:bg-primary/5 rounded-lg w-full cursor-pointer"
            >
              Last 7 Days
            </button>
            <button
              onClick={() => applyPreset(29)}
              className="text-left text-xs font-bold text-gray-400 hover:text-primary transition py-1 px-2 hover:bg-primary/5 rounded-lg w-full cursor-pointer"
            >
              Last 30 Days
            </button>
          </div>

          {/* Calendar Body */}
          <div className="flex-1 flex flex-col gap-2.5">
            {/* Header controls */}
            <div className="flex items-center justify-between">
              <button
                onClick={handlePrevMonth}
                className="p-1 hover:bg-primary/10 rounded-lg text-text transition cursor-pointer"
              >
                <FiChevronLeft />
              </button>
              <span className="text-xs font-black text-text">
                {monthName} {year}
              </span>
              <button
                onClick={handleNextMonth}
                className="p-1 hover:bg-primary/10 rounded-lg text-text transition cursor-pointer"
              >
                <FiChevronRight />
              </button>
            </div>

            {/* Days list label header */}
            <div className="grid grid-cols-7 gap-0.5 text-center font-bold text-gray-400 text-[10px] uppercase tracking-wider">
              <span>Su</span>
              <span>Mo</span>
              <span>Tu</span>
              <span>We</span>
              <span>Th</span>
              <span>Fr</span>
              <span>Sa</span>
            </div>

            {/* Days calendar grid */}
            <div className="grid grid-cols-7 gap-0.5 justify-items-center">
              {renderDays()}
            </div>

            {/* Footer action buttons */}
            <div className="flex items-center justify-end gap-2 border-t border-border pt-2.5 mt-1">
              <button
                onClick={handleClear}
                className="text-[10px] font-black text-red-500 hover:text-red-655 uppercase tracking-wide px-2.5 py-1 rounded-lg hover:bg-red-500/5 transition cursor-pointer"
              >
                Clear
              </button>
              <button
                onClick={handleApply}
                className="bg-primary text-white text-[10px] font-black uppercase tracking-wide px-2.5 py-1 rounded-lg hover:bg-primary/90 transition shadow-sm cursor-pointer"
              >
                Apply
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DateRangePicker;
