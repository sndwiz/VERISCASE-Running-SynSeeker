import { useState, useCallback, useRef } from "react";
import { apiRequest } from "@/lib/queryClient";

interface RecordedEvent {
  eventType: string;
  payloadJson: Record<string, any>;
  ts: string;
}

interface RecorderState {
  isRecording: boolean;
  recordingId: string | null;
  events: RecordedEvent[];
  startedAt: string | null;
}

export function useProcessRecorder() {
  const [state, setState] = useState<RecorderState>({
    isRecording: false,
    recordingId: null,
    events: [],
    startedAt: null,
  });
  const eventsRef = useRef<RecordedEvent[]>([]);
  const flushTimerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startRecording = useCallback(async (title?: string) => {
    try {
      const res = await apiRequest("POST", "/api/recordings", {
        title: title || "Untitled Recording",
        scopeType: "board",
      });
      const recording = await res.json();
      eventsRef.current = [];
      setState({
        isRecording: true,
        recordingId: recording.id,
        events: [],
        startedAt: new Date().toISOString(),
      });

      flushTimerRef.current = setInterval(() => {
        flushEvents(recording.id);
      }, 10000);

      return recording;
    } catch (error) {
      console.error("Failed to start recording:", error);
      return null;
    }
  }, []);

  const flushEvents = useCallback(async (recordingId: string) => {
    if (eventsRef.current.length === 0) return;
    const batch = eventsRef.current.splice(0, eventsRef.current.length);
    try {
      await apiRequest("POST", `/api/recordings/${recordingId}/events`, batch);
    } catch {
      eventsRef.current.unshift(...batch);
    }
  }, []);

  const recordEvent = useCallback((eventType: string, payload: Record<string, any> = {}) => {
    if (!state.isRecording || !state.recordingId) return;
    const event: RecordedEvent = {
      eventType,
      payloadJson: payload,
      ts: new Date().toISOString(),
    };
    eventsRef.current.push(event);
    setState(prev => ({ ...prev, events: [...prev.events, event] }));
  }, [state.isRecording, state.recordingId]);

  const stopRecording = useCallback(async () => {
    if (!state.recordingId) return null;

    if (flushTimerRef.current) {
      clearInterval(flushTimerRef.current);
      flushTimerRef.current = null;
    }

    await flushEvents(state.recordingId);

    try {
      const res = await apiRequest("PATCH", `/api/recordings/${state.recordingId}/stop`);
      const recording = await res.json();
      setState(prev => ({ ...prev, isRecording: false }));
      return recording;
    } catch (error) {
      console.error("Failed to stop recording:", error);
      setState(prev => ({ ...prev, isRecording: false }));
      return null;
    }
  }, [state.recordingId, flushEvents]);

  const convertRecording = useCallback(async (outputType: "automation_rule" | "macro" | "sop") => {
    if (!state.recordingId) return null;
    try {
      const res = await apiRequest("POST", `/api/recordings/${state.recordingId}/convert`, { outputType });
      return await res.json();
    } catch (error) {
      console.error("Failed to convert recording:", error);
      return null;
    }
  }, [state.recordingId]);

  return {
    isRecording: state.isRecording,
    recordingId: state.recordingId,
    events: state.events,
    eventCount: state.events.length,
    startedAt: state.startedAt,
    startRecording,
    stopRecording,
    recordEvent,
    convertRecording,
  };
}
