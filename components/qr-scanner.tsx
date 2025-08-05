'use client';

import { useState, useEffect, useRef } from 'react';
import { Camera, QrCode, AlertCircle, CheckCircle, X } from 'lucide-react';

// Import jsQR for QR code scanning
let jsQR: any = null;
try {
  jsQR = require('jsqr');
} catch (error) {
  console.warn('jsQR not available:', error);
}

interface QRScannerProps {
  isOpen: boolean;
  onScan: (data: string) => void | Promise<void>;
  onClose: () => void;
  loading?: boolean;
  title?: string;
  subtitle?: string;
}

export function QRScanner({ isOpen, onScan, onClose, loading = false, title = "Scan Job QR Code", subtitle }: QRScannerProps) {
  const [scanStatus, setScanStatus] = useState<'idle' | 'camera_loading' | 'camera_ready' | 'scanning' | 'success' | 'error'>('idle');
  const [lastScanError, setLastScanError] = useState<string>('');
  const [cameraPermission, setCameraPermission] = useState<'unknown' | 'granted' | 'denied'>('unknown');
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const scanIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize camera when scanner opens
  useEffect(() => {
    if (isOpen) {
      initializeCamera();
    } else {
      cleanup();
    }
    
    return () => {
      cleanup();
    };
  }, [isOpen]);

  const cleanup = () => {
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
      scanIntervalRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
    setScanStatus('idle');
    setCameraPermission('unknown');
    setLastScanError('');
  };

  const initializeCamera = async () => {
    try {
      console.log('Starting camera initialization...');
      setScanStatus('camera_loading');
      setLastScanError('');

      // Small delay to ensure DOM is ready
      await new Promise(resolve => setTimeout(resolve, 100));

      // Check if video element exists
      if (!videoRef.current) {
        console.error('Video element not found in ref');
        throw new Error('Video element not available');
      }

      // Check if getUserMedia is supported
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera not supported in this browser');
      }

      console.log('Requesting camera access...');
      
      // Request camera with environment (back) camera preference for better QR scanning
      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: 'environment' }, // Prefer back camera
          width: { ideal: 1280, min: 640 },
          height: { ideal: 720, min: 480 }
        }
      }).catch(async () => {
        // Fallback to any camera if back camera fails
        return navigator.mediaDevices.getUserMedia({ video: true });
      });

      console.log('Camera stream obtained');
      streamRef.current = stream;
      setCameraPermission('granted');

      // Set video source
      videoRef.current.srcObject = stream;
      
      // Wait for video to be ready and play
      videoRef.current.onloadedmetadata = async () => {
        try {
          console.log('Video metadata loaded');
          await videoRef.current?.play();
          console.log('Video started playing');
          setScanStatus('camera_ready');
          // Start scanning for QR codes
          startQRScanning();
        } catch (playError) {
          console.error('Video play failed:', playError);
          setScanStatus('error');
          setLastScanError('Failed to start video');
        }
      };

    } catch (error) {
      console.error('Camera initialization failed:', error);
      setScanStatus('error');
      
      if (error instanceof Error) {
        if (error.name === 'NotAllowedError') {
          setCameraPermission('denied');
          setLastScanError('Camera access denied. Please allow camera access.');
        } else if (error.name === 'NotFoundError') {
          setLastScanError('No camera found on this device.');
        } else {
          setLastScanError(error.message);
        }
      } else {
        setLastScanError('Failed to access camera');
      }
    }
  };

  const startQRScanning = () => {
    console.log('Starting QR code scanning...');
    scanIntervalRef.current = setInterval(() => {
      scanForQRCode();
    }, 300); // Scan every 300ms for better performance
  };

  const scanForQRCode = () => {
    if (!videoRef.current || !canvasRef.current || scanStatus !== 'camera_ready') {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const context = canvas.getContext('2d');

    if (!context || video.videoWidth === 0 || video.videoHeight === 0) {
      return;
    }

    // Set canvas dimensions to match video
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    // Draw current video frame to canvas
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    // Get image data for QR code scanning
    const imageData = context.getImageData(0, 0, canvas.width, canvas.height);

    if (jsQR) {
      try {
        const qrCode = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: "dontInvert",
        });
        
        if (qrCode && qrCode.data) {
          console.log('QR Code detected:', qrCode.data);
          handleQRCodeDetected(qrCode.data);
        }
      } catch (error) {
        console.error('QR scanning error:', error);
      }
    }
  };

  const handleQRCodeDetected = async (qrData: string) => {
    try {
      // Stop scanning immediately
      if (scanIntervalRef.current) {
        clearInterval(scanIntervalRef.current);
        scanIntervalRef.current = null;
      }
      
      setScanStatus('scanning');
      console.log('Processing QR code data:', qrData);
      
      // Call the onScan handler with the QR data
      await onScan(qrData);
      setScanStatus('success');

      // Auto close on success after showing success state
      setTimeout(() => {
        onClose();
      }, 1500);

    } catch (error) {
      console.error('QR code processing error:', error);
      setScanStatus('error');
      setLastScanError(error instanceof Error ? error.message : 'Scan processing failed');
      
      // Restart scanning after error
      setTimeout(() => {
        if (streamRef.current && scanStatus !== 'success') {
          setScanStatus('camera_ready');
          startQRScanning();
        }
      }, 2000);
    }
  };

  const handleMockScan = async (jobId: number = 1) => {
    try {
      setScanStatus('scanning');
      setLastScanError('');
      
      const mockQRData = JSON.stringify({
        jobId: jobId,
        jobName: `Office Cleaning Job ${jobId}`,
        clientName: "ABC Company",
        workCenter: "Building A",
        startDate: new Date().toISOString(),
        endDate: new Date(Date.now() + 8*60*60*1000).toISOString(),
        timestamp: new Date().toISOString()
      });
      
      console.log('Mock scan data:', mockQRData);
      await onScan(mockQRData);
      setScanStatus('success');
      
      setTimeout(() => {
        onClose();
      }, 1500);
      
    } catch (error) {
      console.error('Mock scan failed:', error);
      setScanStatus('error');
      setLastScanError(error instanceof Error ? error.message : 'Scan failed');
    }
  };

  const handleClose = () => {
    cleanup();
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black/80 flex items-center justify-center z-50">
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="flex justify-between items-center mb-4">
          <div className="flex items-center gap-2">
            <QrCode className="w-5 h-5 text-purple-600" />
            <h2 className="text-lg font-semibold">{title}</h2>
          </div>
          <button 
            onClick={handleClose}
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 p-1"
            disabled={loading}
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        
        {subtitle && (
          <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{subtitle}</p>
        )}

        {/* Camera Scanner Area */}
        <div className="relative bg-black rounded-lg overflow-hidden mb-4" style={{ aspectRatio: '4/3' }}>
          {/* Video element - always rendered */}
          <video
            ref={videoRef}
            className={`w-full h-full object-cover ${scanStatus === 'camera_ready' ? 'block' : 'hidden'}`}
            autoPlay
            playsInline
            muted
          />
          {/* Hidden canvas for QR code scanning */}
          <canvas ref={canvasRef} className="hidden" />

          {scanStatus === 'camera_loading' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Starting camera...</p>
              <p className="text-xs opacity-75 mt-1">Status: {cameraPermission}</p>
            </div>
          )}

          {scanStatus === 'camera_ready' && (
            <>
              {/* Scanning overlay */}
              <div className="absolute inset-0 flex items-center justify-center">
                <div className="w-48 h-48 border-2 border-white/70 rounded-lg relative">
                  <div className="absolute top-0 left-0 w-6 h-6 border-t-2 border-l-2 border-purple-400"></div>
                  <div className="absolute top-0 right-0 w-6 h-6 border-t-2 border-r-2 border-purple-400"></div>
                  <div className="absolute bottom-0 left-0 w-6 h-6 border-b-2 border-l-2 border-purple-400"></div>
                  <div className="absolute bottom-0 right-0 w-6 h-6 border-b-2 border-r-2 border-purple-400"></div>
                  
                  {/* Scanning line animation */}
                  <div className="absolute inset-x-0 h-0.5 bg-purple-400 animate-pulse" style={{
                    top: '50%',
                    boxShadow: '0 0 10px rgba(147, 51, 234, 0.8)'
                  }}></div>
                </div>
              </div>
              
              <div className="absolute bottom-4 left-1/2 transform -translate-x-1/2 text-white text-center">
                <p className="text-sm font-medium">Position QR code in the frame</p>
                <p className="text-xs opacity-75">Scanning automatically...</p>
              </div>
            </>
          )}

          {scanStatus === 'error' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white p-4">
              <AlertCircle className="w-12 h-12 text-red-400 mb-3" />
              <p className="text-sm text-center mb-3">Camera Error</p>
              <p className="text-xs text-center mb-3 opacity-75">{lastScanError}</p>
              <button
                onClick={initializeCamera}
                className="px-4 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700"
              >
                Try Again
              </button>
            </div>
          )}

          {scanStatus === 'scanning' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-purple-500/20">
              <div className="w-12 h-12 border-4 border-white/30 border-t-white rounded-full animate-spin mb-3"></div>
              <p className="text-sm">Processing scan...</p>
            </div>
          )}

          {scanStatus === 'success' && (
            <div className="absolute inset-0 flex flex-col items-center justify-center text-white bg-green-500/20">
              <CheckCircle className="w-12 h-12 text-green-400 mb-3" />
              <p className="text-sm font-medium">Scan successful!</p>
            </div>
          )}
        </div>

        {/* Instructions */}
        <div className="space-y-2 mb-4">
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
            <span>Point camera at the QR code on your job assignment</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
            <span>Hold steady until code is detected</span>
          </div>
          <div className="flex items-center gap-2 text-xs text-gray-600 dark:text-gray-400">
            <div className="w-1.5 h-1.5 bg-purple-600 rounded-full"></div>
            <span>Only assigned jobs can be scanned</span>
          </div>
        </div>

        {/* Mock Scan Buttons for Testing - Remove these in production */}
        <div className="border-t pt-4">
          <p className="text-xs text-gray-500 dark:text-gray-500 mb-2">Testing Only (Remove in Production):</p>
          <div className="flex gap-2 mb-2">
            <button 
              onClick={() => handleMockScan(1)}
              disabled={loading || scanStatus === 'scanning'}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Job 1
            </button>
            <button 
              onClick={() => handleMockScan(2)}
              disabled={loading || scanStatus === 'scanning'}
              className="flex-1 px-3 py-2 bg-purple-600 text-white rounded text-sm hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Test Job 2
            </button>
          </div>
          <div className="flex gap-2">
            <button 
              onClick={initializeCamera}
              disabled={loading || scanStatus === 'scanning'}
              className="flex-1 px-3 py-2 bg-blue-600 text-white rounded text-sm hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
            >
              Restart Camera
            </button>
            <button 
              onClick={() => {
                console.log('Scanner Debug Info:', {
                  scanStatus,
                  cameraPermission,
                  hasVideo: !!videoRef.current,
                  hasCanvas: !!canvasRef.current,
                  hasStream: !!streamRef.current,
                  jsQRAvailable: !!jsQR,
                  videoSrc: videoRef.current?.srcObject ? 'Set' : 'Not set',
                  videoPlaying: videoRef.current ? !videoRef.current.paused : false,
                  videoWidth: videoRef.current?.videoWidth || 0,
                  videoHeight: videoRef.current?.videoHeight || 0,
                  lastError: lastScanError
                });
                alert('Debug info logged to console. jsQR available: ' + (!!jsQR));
              }}
              className="flex-1 px-3 py-2 bg-gray-600 text-white rounded text-sm hover:bg-gray-700"
            >
              Debug Info
            </button>
          </div>
        </div>

        {/* Error Display */}
        {lastScanError && scanStatus === 'error' && (
          <div className="mt-4 p-3 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg">
            <p className="text-red-700 dark:text-red-400 text-sm">{lastScanError}</p>
            <button
              onClick={initializeCamera}
              className="mt-2 px-3 py-1 bg-red-600 text-white rounded text-xs hover:bg-red-700"
            >
              Retry Camera
            </button>
          </div>
        )}
      </div>
    </div>
  );
}


