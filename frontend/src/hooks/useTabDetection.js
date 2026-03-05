// useTabDetection.js
import { useEffect, useRef, useCallback } from "react";

export function useTabDetection({ onViolation, maxViolations = 3, speak }) {
  const violationCount = useRef(0);
  const violations = useRef([]); // array of { timestamp, count }
  const isSpeaking = useRef(false);

  const handleVisibilityChange = useCallback(() => {
    if (document.visibilityState === "hidden") {
      violationCount.current += 1;
      const violation = {
        timestamp: new Date().toISOString(),
        count: violationCount.current,
      };
      violations.current.push(violation);
      onViolation?.(violation, violations.current);

      // Prepare warning message
      const remaining = maxViolations - violationCount.current;
      let msg = "";

      if (violationCount.current === 1) {
        msg = "Warning. You have left the exam window. Please return immediately. This has been recorded.";
      } else if (violationCount.current === 2) {
        msg = `Second warning. You have left the exam window ${violationCount.current} times. One more violation will be flagged for your teacher.`;
      } else {
        msg = `Final warning. You have left the exam window ${violationCount.current} times. This exam session has been flagged for review.`;
      }

      // Speak warning when they return (visibilityState === "visible")
      const speakOnReturn = () => {
        if (document.visibilityState === "visible" && !isSpeaking.current) {
          isSpeaking.current = true;
          speak?.(msg);
          
          // Reset speaking flag after message
          setTimeout(() => {
            isSpeaking.current = false;
          }, 3000);
          
          document.removeEventListener("visibilitychange", speakOnReturn);
        }
      };

      document.addEventListener("visibilitychange", speakOnReturn);
    }
  }, [onViolation, maxViolations, speak]);

  useEffect(() => {
    document.addEventListener("visibilitychange", handleVisibilityChange);
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [handleVisibilityChange]);

  return {
    violationCount: violationCount.current,
    violations: violations.current,
  };
}

export default useTabDetection;
