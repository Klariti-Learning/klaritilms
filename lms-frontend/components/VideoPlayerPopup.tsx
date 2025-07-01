"use client";

import { useState, useRef, useEffect } from "react";
import ReactPlayer from "react-player";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import {
  Volume2,
  VolumeX,
  Play,
  Pause,
  Maximize,
  Minimize,
} from "lucide-react";
import { VideoPlayerPopupProps } from "@/types";

export default function VideoPlayerPopup({
  isOpen,
  onClose,
  videoUrl,
  title,
}: VideoPlayerPopupProps) {
  const playerRef = useRef<ReactPlayer>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isFullScreen, setIsFullScreen] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setIsPlaying(false);
      setCurrentTime(0);
    }
  }, [isOpen]);

  const handleProgress = (state: { playedSeconds: number }) => {
    setCurrentTime(state.playedSeconds);
  };

  const handleDuration = (duration: number) => {
    setDuration(duration);
  };

  const togglePlay = () => {
    setIsPlaying(!isPlaying);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const handleVolumeChange = (value: number[]) => {
    setVolume(value[0]);
    setIsMuted(value[0] === 0);
  };

  const handleTimeChange = (value: number[]) => {
    if (playerRef.current) {
      playerRef.current.seekTo(value[0], "seconds");
      setCurrentTime(value[0]);
    }
  };

  const changePlaybackRate = (rate: number) => {
    setPlaybackRate(rate);
  };

  const formatTime = (seconds: number) => {
    const minutes = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${minutes}:${secs < 10 ? "0" : ""}${secs}`;
  };

  if (!isOpen) return null;

  return (
    <div
      className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 ${
        isFullScreen ? "p-0" : "p-4"
      }`}
    >
      <div
        className={`bg-white rounded-lg shadow-lg ${
          isFullScreen ? "w-full h-full" : "w-3/4 h-3/4"
        } flex flex-col`}
      >
        <div className="flex justify-between items-center p-4 border-b">
          <h2 className="text-2xl font-bold">{title}</h2>
          <div className="flex space-x-2">
            <Button
              onClick={() => setIsFullScreen(!isFullScreen)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              {isFullScreen ? <Minimize /> : <Maximize />}
            </Button>
            <Button
              onClick={onClose}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Close
            </Button>
          </div>
        </div>
        <div className="flex-1 p-4 overflow-auto">
          <ReactPlayer
            ref={playerRef}
            url={videoUrl}
            playing={isPlaying}
            volume={volume}
            muted={isMuted}
            playbackRate={playbackRate}
            width="100%"
            height="60vh"
            onProgress={handleProgress}
            onDuration={handleDuration}
            config={{
              file: {
                attributes: {
                  controlsList: "nodownload",
                  onContextMenu: (e: React.MouseEvent) => e.preventDefault(),
                },
              },
            }}
          />
          <div className="flex items-center space-x-4 mt-2">
            <Button onClick={togglePlay}>
              {isPlaying ? <Pause /> : <Play />}
            </Button>
            <Slider
              value={[currentTime]}
              max={duration}
              step={0.1}
              onValueChange={handleTimeChange}
              className="flex-1"
            />
            <span>{`${formatTime(currentTime)} / ${formatTime(
              duration
            )}`}</span>
            <Button onClick={toggleMute}>
              {isMuted ? <VolumeX /> : <Volume2 />}
            </Button>
            <Slider
              value={[volume]}
              max={1}
              step={0.01}
              onValueChange={handleVolumeChange}
              className="w-24"
            />
            <select
              value={playbackRate}
              onChange={(e) => changePlaybackRate(Number(e.target.value))}
              className="border rounded p-1"
            >
              {[0.5, 1, 1.5, 2].map((rate) => (
                <option key={rate} value={rate}>
                  {rate}x
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>
    </div>
  );
}
