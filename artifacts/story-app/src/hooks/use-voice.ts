import { useCallback, useEffect, useRef, useState } from "react";

export type VoiceState = "idle" | "listening" | "speaking";

export function useVoice(enabled: boolean) {
  const [state, setState] = useState<VoiceState>("idle");
  const recognitionRef = useRef<SpeechRecognition | null>(null);
  const synthRef = useRef(typeof window !== "undefined" ? window.speechSynthesis : null);

  useEffect(() => {
    return () => {
      synthRef.current?.cancel();
      recognitionRef.current?.abort();
    };
  }, []);

  const speak = useCallback(
    (text: string): Promise<void> => {
      return new Promise((resolve) => {
        if (!enabled || !synthRef.current) {
          resolve();
          return;
        }
        synthRef.current.cancel();
        const utterance = new SpeechSynthesisUtterance(text);
        utterance.rate = 0.95;
        utterance.pitch = 1.0;
        utterance.onstart = () => setState("speaking");
        utterance.onend = () => {
          setState("idle");
          resolve();
        };
        utterance.onerror = () => {
          setState("idle");
          resolve();
        };
        synthRef.current.speak(utterance);
      });
    },
    [enabled]
  );

  const stopSpeaking = useCallback(() => {
    synthRef.current?.cancel();
    setState("idle");
  }, []);

  const listen = useCallback(
    (onResult: (transcript: string) => void, onEnd?: () => void): (() => void) => {
      if (!enabled) return () => {};

      const SpeechRecognitionImpl =
        (window as Window & typeof globalThis & { SpeechRecognition?: typeof SpeechRecognition; webkitSpeechRecognition?: typeof SpeechRecognition }).SpeechRecognition ||
        (window as Window & typeof globalThis & { webkitSpeechRecognition?: typeof SpeechRecognition }).webkitSpeechRecognition;

      if (!SpeechRecognitionImpl) {
        alert("Your browser does not support voice recognition. Try Chrome or Edge.");
        return () => {};
      }

      const recognition = new SpeechRecognitionImpl();
      recognitionRef.current = recognition;
      recognition.continuous = false;
      recognition.interimResults = false;
      recognition.lang = "en-US";

      recognition.onstart = () => setState("listening");
      recognition.onresult = (e) => {
        const transcript = e.results[0]?.[0]?.transcript ?? "";
        onResult(transcript);
      };
      recognition.onend = () => {
        setState("idle");
        onEnd?.();
      };
      recognition.onerror = () => {
        setState("idle");
        onEnd?.();
      };

      recognition.start();

      return () => {
        recognition.abort();
        setState("idle");
      };
    },
    [enabled]
  );

  return { state, speak, stopSpeaking, listen };
}
