"use client";

import { Triangle } from "react-loader-spinner";

interface LoaderProps {
  height?: string;
  width?: string;
  color?: string;
  ariaLabel?: string;
  wrapperStyle?: { [key: string]: string };
  wrapperClass?: string;
  visible?: boolean;
  fullScreen?: boolean;
}

const Loader: React.FC<LoaderProps> = ({
  height = "80",
  width = "80",
  color = "#ff0000",
  ariaLabel = "triangle-loading",
  wrapperStyle = {},
  wrapperClass = "",
  visible = true,
  fullScreen = true,
}) => {
  return (
    <div
      className={`flex items-center justify-center ${
        fullScreen ? "min-h-screen bg-gray-100" : "bg-white"
      }`}
      style={{
        backgroundColor: fullScreen ? "#f3f4f6" : "#ffffff",
        position: fullScreen ? "fixed" : "relative",
        top: fullScreen ? "0" : "auto",
        left: fullScreen ? "0" : "auto",
        right: fullScreen ? "0" : "auto",
        bottom: fullScreen ? "0" : "auto",
        zIndex: fullScreen ? "9999" : "auto",
      }}
    >
      <div className="flex flex-col items-center space-y-4">
        <Triangle
          visible={visible}
          height={height}
          width={width}
          color={color}
          ariaLabel={ariaLabel}
          wrapperStyle={wrapperStyle}
          wrapperClass={wrapperClass}
        />
      </div>
    </div>
  );
};

export default Loader;
