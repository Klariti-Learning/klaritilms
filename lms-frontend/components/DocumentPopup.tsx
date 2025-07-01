"use client";

import { useState, useEffect, useRef } from "react";
import { createPortal } from "react-dom"; // Import createPortal
import { Button } from "@/components/ui/button";
import { Document, Page } from "react-pdf";
import Image from "next/image";
import { DocumentPopupProps } from "@/types";
import { pdfjs } from "react-pdf";
import { X } from "lucide-react";
import { FaWindowMinimize, FaWindowMaximize } from "react-icons/fa";

pdfjs.GlobalWorkerOptions.workerSrc = `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;

export default function DocumentPopup({
  isOpen,
  onClose,
  topic,
  documentUrl,
  documentType,
}: DocumentPopupProps) {
  const [isFullScreen, setIsFullScreen] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pageNumber, setPageNumber] = useState(1);
  const [numPages, setNumPages] = useState<number | null>(null);
  const [fileUrl, setFileUrl] = useState<string>("");
  const [useIframe, setUseIframe] = useState(false);
  const [effectiveDocumentType, setEffectiveDocumentType] = useState<string>("");
  const iframeRef = useRef<HTMLIFrameElement>(null);
  const loadingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [showControls, setShowControls] = useState(false);

  // Create a ref for the portal container
  const portalContainerRef = useRef<HTMLDivElement | null>(null);

  // Initialize portal container on mount
  useEffect(() => {
    portalContainerRef.current = document.createElement("div");
    portalContainerRef.current.setAttribute("id", "document-popup-portal");
    document.body.appendChild(portalContainerRef.current);

    return () => {
      if (portalContainerRef.current) {
        document.body.removeChild(portalContainerRef.current);
      }
    };
  }, []);

  const transformGoogleDriveUrl = (
    url: string,
    mode: "download" | "viewer"
  ): string => {
    const fileIdMatch = url.match(/\/d\/([^/]+)/);
    if (fileIdMatch && fileIdMatch[1]) {
      const fileId = fileIdMatch[1];
      return mode === "download"
        ? `https://drive.google.com/uc?export=download&id=${fileId}`
        : `https://drive.google.com/file/d/${fileId}/preview?embedded=true`;
    }
    return url;
  };

  const determineDocumentType = (url: string, providedType: string): string => {
    if (url.includes("drive.google.com")) {
      const fileExtMatch = url.match(/\.([a-zA-Z0-9]+)(?:\?|$)/);
      if (fileExtMatch && fileExtMatch[1]) {
        return fileExtMatch[1].toLowerCase();
      }
      return "pdf";
    }
    const cleanType = providedType.split("/").pop() || providedType;
    return cleanType.toLowerCase();
  };

  const forceIframeDisplay = () => {
    if (iframeRef.current) {
      setIsLoading(false);
      iframeRef.current.style.display = "none";
      setTimeout(() => {
        if (iframeRef.current) {
          iframeRef.current.style.display = "block";
        }
      }, 50);
    }
  };

  const clearLoadingTimeout = () => {
    if (loadingTimeoutRef.current) {
      clearTimeout(loadingTimeoutRef.current);
      loadingTimeoutRef.current = null;
    }
  };

  useEffect(() => {
    setIsLoading(true);
    setError(null);
    setPageNumber(1);
    setNumPages(null);
    clearLoadingTimeout();

    const correctedDocumentType = determineDocumentType(documentUrl, documentType);
    setEffectiveDocumentType(correctedDocumentType);

    if (documentUrl.includes("drive.google.com")) {
      const viewerUrl = transformGoogleDriveUrl(documentUrl, "viewer");
      setFileUrl(viewerUrl);
      setUseIframe(true);
      loadingTimeoutRef.current = setTimeout(() => {
        forceIframeDisplay();
      }, 3000);
    } else {
      const url = `/api/documents/proxy?url=${encodeURIComponent(documentUrl)}`;
      setFileUrl(url);
      setUseIframe(false);
      loadingTimeoutRef.current = setTimeout(() => {
        setIsLoading(false);
        setError("Failed to load document. Please try again later.");
      }, 10000);
    }

    return () => clearLoadingTimeout();
  }, [documentUrl, documentType]);

  const toggleFullScreen = async () => {
    if (!isFullScreen) {
      try {
        await document.documentElement.requestFullscreen();
        setIsFullScreen(true);
      } catch (err) {
        console.error("DocumentPopup: Failed to enter fullscreen", err);
        setIsFullScreen(true);
      }
    } else {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
      setIsFullScreen(false);
    }
    setShowControls(false);
  };

  const handleIframeLoad = () => {
    clearLoadingTimeout();
    setIsLoading(false);
    setError(null);
  };

  const handleIframeError = () => {
    console.error("DocumentPopup: Iframe load error");
    clearLoadingTimeout();
    setIsLoading(false);
    setError("Failed to load document in viewer. Please try again later.");
  };

  const renderDocument = () => {
    const lowerType = effectiveDocumentType.toLowerCase();

    if (useIframe) {
      return (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            ref={iframeRef}
            src={fileUrl}
            className={`w-full h-full ${
              isFullScreen ? "w-screen h-screen" : "max-h-[calc(85vh-4rem)]"
            } object-contain aspect-[16/9] rounded-md`}
            title={`${topic} Document`}
            allowFullScreen
            sandbox="allow-same-origin allow-scripts"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      );
    }

    if (lowerType === "pdf") {
      return (
        <div
          className={`w-full h-full overflow-hidden ${
            isFullScreen ? "flex flex-col justify-center" : ""
          }`}
        >
          <Document
            file={fileUrl}
            onLoadSuccess={({ numPages }) => {
              setNumPages(numPages);
              setIsLoading(false);
              setError(null);
            }}
            onLoadError={(err) => {
              console.error("DocumentPopup: PDF load error =", err.message);
              setIsLoading(false);
              if (documentUrl.includes("drive.google.com") && !useIframe) {
                const viewerUrl = transformGoogleDriveUrl(documentUrl, "viewer");
                setFileUrl(viewerUrl);
                setUseIframe(true);
              } else {
                setError(`Failed to load PDF: ${err.message}. Please try again later.`);
              }
            }}
          >
            <Page
              pageNumber={pageNumber}
              className={`mx-auto ${
                isFullScreen ? "w-screen h-screen object-contain" : "w-full max-h-[calc(85vh-4rem)]"
              } rounded-md`}
              width={isFullScreen ? undefined : undefined}
              renderMode="canvas"
            />
          </Document>
          {numPages && (
            <div
              className={`flex justify-center space-x-2 mt-2 ${
                isFullScreen ? "absolute bottom-4 z-300" : "relative"
              }`}
            >
              <Button
                disabled={pageNumber <= 1}
                onClick={() => setPageNumber(pageNumber - 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white hover:bg-opacity-80 text-sm py-1 px-2 cursor-pointer"
              >
                Previous
              </Button>
              <Button
                disabled={pageNumber >= (numPages || 1)}
                onClick={() => setPageNumber(pageNumber + 1)}
                className="bg-blue-600 hover:bg-blue-700 text-white hover:bg-opacity-80 text-sm py-1 px-2 cursor-pointer"
              >
                Next
              </Button>
              <span
                className={`text-sm ${
                  isFullScreen ? "text-white" : "text-gray-600"
                }`}
              >
                Page {pageNumber} of {numPages}
              </span>
            </div>
          )}
        </div>
      );
    }

    if (["doc", "docx", "ppt", "pptx"].includes(lowerType)) {
      const viewerUrl = `https://drive.google.com/viewerng/viewer?embedded=true&url=${encodeURIComponent(fileUrl)}`;
      return (
        <div className="relative w-full h-full overflow-hidden">
          <iframe
            ref={iframeRef}
            src={viewerUrl}
            className={`w-full h-full ${
              isFullScreen ? "w-screen h-screen" : "max-h-[calc(85vh-4rem)]"
            } object-contain aspect-[16/9] rounded-md`}
            title={`${topic} Document`}
            allowFullScreen
            sandbox="allow-same-origin allow-scripts"
            onLoad={handleIframeLoad}
            onError={handleIframeError}
          />
        </div>
      );
    }

    if (["jpg", "jpeg", "avif", "png"].includes(lowerType)) {
      return (
        <div className="relative w-full h-full overflow-hidden">
          <Image
            src={fileUrl}
            alt={`${topic} Document`}
            width={800}
            height={600}
            className={`w-full ${
              isFullScreen ? "w-screen h-screen" : "max-h-[calc(85vh-4rem)]"
            } object-contain rounded-md`}
            onLoad={() => {
              setIsLoading(false);
              setError(null);
            }}
            onError={() => {
              console.error("DocumentPopup: Image load error");
              setIsLoading(false);
              setError("Failed to load image. Please try again later.");
            }}
          />
        </div>
      );
    }

    console.warn("DocumentPopup: Unsupported document type =", lowerType);
    setIsLoading(false);
    setError(`Unsupported document format: ${effectiveDocumentType}. Please try again later.`);
    return (
      <div className="text-center p-4">
        <p className="text-red-500">{error}</p>
      </div>
    );
  };

  if (!isOpen) return null;

  // Render the popup using a portal
  return portalContainerRef.current
    ? createPortal(
        <div
          className={`fixed inset-0 ${
            isFullScreen ? "bg-black" : "bg-black/50"
          } flex items-center justify-center z-[1500] transition-all duration-300 ease-in-out ${
            isOpen ? "opacity-100" : "opacity-0"
          }`}
        >
          <div
            className={`relative ${
              isFullScreen
                ? "w-screen h-screen"
                : "w-[95vw] sm:w-3/4 md:w-2/3 lg:w-1/2 max-w-[90vw] min-w-[300px] h-[85vh] max-h-[90vh]"
            } flex flex-col ${
              isFullScreen ? "bg-black" : "bg-white rounded-md shadow-lg"
            } transition-all duration-300 ease-in-out ${
              isOpen ? "scale-100" : "scale-95"
            }`}
          >
            {isFullScreen && (
              <div
                className={`absolute top-0 left-0 right-0 z-200 transition-opacity duration-200 ease-in-out ${
                  showControls ? "opacity-100" : "opacity-0"
                } bg-black/90 py-2 px-4 flex justify-between items-center pointer-events-auto`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
              >
                <h2 className="text-lg font-semibold text-white">{topic}</h2>
                <div className="flex space-x-2">
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleFullScreen();
                    }}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-2 hover:bg-opacity-80 pointer-events-auto cursor-pointer"
                    title="Minimize"
                    aria-label="Minimize"
                  >
                    <FaWindowMinimize size={16} />
                  </Button>
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onClose();
                    }}
                    className="bg-red-600 hover:bg-red-700 text-white p-2 hover:bg-opacity-80 pointer-events-auto cursor-pointer"
                    title="Close"
                    aria-label="Close"
                  >
                    <X size={16} />
                  </Button>
                </div>
              </div>
            )}
            {isFullScreen && (
              <div
                className={`absolute top-0 left-0 right-0 h-16 z-100 ${
                  showControls ? "pointer-events-none" : "pointer-events-auto"
                }`}
                onMouseEnter={() => setShowControls(true)}
                onMouseLeave={() => setShowControls(false)}
              />
            )}
            {!isFullScreen && (
              <div className="flex justify-between items-center p-1 sm:p-2 border-b bg-white">
                <h2 className="text-lg sm:text-xl font-bold">{topic}</h2>
                <div className="flex space-x-2">
                  <Button
                    onClick={toggleFullScreen}
                    className="bg-blue-600 hover:bg-blue-700 text-white p-1 sm:p-2 hover:bg-opacity-80 cursor-pointer"
                    title="Full Screen"
                    aria-label="Full Screen"
                  >
                    <FaWindowMaximize size={14} />
                  </Button>
                  <Button
                    onClick={onClose}
                    className="bg-red-600 hover:bg-red-700 text-white p-1 sm:p-2 hover:bg-opacity-80 cursor-pointer"
                    title="Close"
                    aria-label="Close"
                  >
                    <X size={14} />
                  </Button>
                </div>
              </div>
            )}
            <div
              className={`flex-1 ${
                isFullScreen ? "p-0" : "p-1 sm:p-2"
              } overflow-hidden relative transition-transform duration-200 ease-in-out ${
                isFullScreen && showControls ? "scale-95" : "scale-100"
              }`}
            >
              {isLoading && (
                <div className="text-center p-4 absolute inset-0 flex flex-col justify-center">
                  <svg
                    className="animate-spin h-5 w-5 mx-auto text-blue-600"
                    viewBox="0 0 24 24"
                  >
                    <circle
                      cx="12"
                      cy="12"
                      r="10"
                      stroke="currentColor"
                      strokeWidth="4"
                      fill="none"
                    />
                  </svg>
                  <p
                    className={`${
                      isFullScreen ? "text-white" : "text-gray-600"
                    } mt-2`}
                  >
                    Loading document...
                  </p>
                </div>
              )}
              {error && (
                <div className="text-center p-4 absolute inset-0 flex items-center justify-center">
                  <p className="text-red-500">{error}</p>
                </div>
              )}
              {!isLoading && !error && renderDocument()}
              {useIframe && fileUrl && (
                <div className={`${isLoading ? "hidden" : "block"} h-full`}>
                  {renderDocument()}
                </div>
              )}
            </div>
          </div>
        </div>,
        portalContainerRef.current
      )
    : null;
}