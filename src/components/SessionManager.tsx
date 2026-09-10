import React, { useEffect, useState, useCallback, useRef } from "react";
import { SessionTimeoutModal } from "./SessionTimeoutModal";
import { clearActiveSession } from "@/lib/session";
import { useNavigate } from "react-router-dom";

interface SessionManagerProps {
  children: React.ReactNode;
}

// 30 minutes in milliseconds
const INACTIVITY_TIMEOUT_MS = 30 * 60 * 1000; 
// 2 minutes warning
const WARNING_THRESHOLD_MS = 2 * 60 * 1000; 

export function SessionManager({ children }: SessionManagerProps) {
  const [showModal, setShowModal] = useState(false);
  const [countdown, setCountdown] = useState(WARNING_THRESHOLD_MS / 1000);
  const lastActiveTimeRef = useRef<number>(Date.now());
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const navigate = useNavigate();

  const resetTimer = useCallback(() => {
    lastActiveTimeRef.current = Date.now();
    if (showModal) {
      setShowModal(false);
      setCountdown(WARNING_THRESHOLD_MS / 1000);
    }
  }, [showModal]);

  const handleLogout = useCallback(() => {
    clearActiveSession();
    navigate("/login");
  }, [navigate]);

  useEffect(() => {
    // Events to track activity
    const activityEvents = [
      "mousedown",
      "mousemove",
      "keydown",
      "scroll",
      "touchstart",
      "click"
    ];

    const handleUserActivity = () => {
      // Only reset timer if modal is not currently showing. 
      // If modal is showing, they MUST click "Stay Signed In" to reset.
      if (!showModal) {
        lastActiveTimeRef.current = Date.now();
      }
    };

    activityEvents.forEach((event) => {
      window.addEventListener(event, handleUserActivity, { passive: true });
    });

    // Check inactivity every second
    timerRef.current = setInterval(() => {
      const now = Date.now();
      const inactiveDuration = now - lastActiveTimeRef.current;
      const remainingTotalTime = INACTIVITY_TIMEOUT_MS - inactiveDuration;

      if (remainingTotalTime <= 0) {
        // Time is up, force logout
        if (timerRef.current) clearInterval(timerRef.current);
        handleLogout();
      } else if (remainingTotalTime <= WARNING_THRESHOLD_MS) {
        // We are in the warning zone
        if (!showModal) {
          setShowModal(true);
        }
        setCountdown(Math.ceil(remainingTotalTime / 1000));
      }
    }, 1000);

    return () => {
      activityEvents.forEach((event) => {
        window.removeEventListener(event, handleUserActivity);
      });
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [showModal, handleLogout]);

  return (
    <>
      {children}
      <SessionTimeoutModal 
        isOpen={showModal}
        countdownSeconds={countdown}
        onStaySignedIn={resetTimer}
        onLogOut={handleLogout}
      />
    </>
  );
}
