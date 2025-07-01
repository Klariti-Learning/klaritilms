"use client";

import Loader from "@/components/Loader";

interface LoadingPageProps {
  message?: string;
  color?: string;
}

const LoadingPage: React.FC<LoadingPageProps> = ({ 
  message = "Loading...", 
  color = "#ff0000" 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center">
      <Loader
        height="80"
        width="80"
        color={color}
        ariaLabel="triangle-loading"
        wrapperStyle={{}}
        wrapperClass=""
        visible={true}
        fullScreen={false}
      />
      {message && (
        <p className="mt-4 text-gray-600 text-lg font-medium">{message}</p>
      )}
    </div>
  );
};

export default LoadingPage; 