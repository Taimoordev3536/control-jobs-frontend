
'use client';

import { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import jsQR from 'jsqr';

export default function Home() {
  const [inputText, setInputText] = useState('');
  const [qrCodeUrl, setQrCodeUrl] = useState('');
  const [scanResult, setScanResult] = useState('');
  const [scanning, setScanning] = useState(false);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const animationRef = useRef<number | null>(null);
  const [cameraReady, setCameraReady] = useState(false);

  // Generate QR Code
  const generateQRCode = async () => {
    if (!inputText) {
      alert('Please enter text or URL');
      return;
    }
    try {
      const url = await QRCode.toDataURL(inputText);
      setQrCodeUrl(url);
    } catch (err) {
      console.error('QR Code generation failed:', err);
      alert('QR code generation failed.');
    }
  };

  // Start Scanner
  const startScanner = async () => {
    if (!navigator.mediaDevices?.getUserMedia) {
      alert('Camera access not supported');
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play();
        setCameraReady(true);
        setScanning(true);
        scanQRCode(); // Start scanning loop
      }
    } catch (err: any) {
      console.error('Camera error:', err);
      alert(`Camera access denied: ${err.message}`);
    }
  };

  // Scan QR Code with 2-second delay between scans
  const scanQRCode = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    if (video.readyState === video.HAVE_ENOUGH_DATA) {
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      ctx.drawImage(video, 0, 0, canvas.width, canvas.height);

      const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
      const code = jsQR(imageData.data, imageData.width, imageData.height);

      if (code) {
        setScanResult(`Scanned: ${code.data}`);
        stopScanner();
        return;
      } else {
        setScanResult('Scanning...');
      }
    } else {
      setScanResult('Waiting for camera...');
    }

    // Delay next scan attempt by 2 seconds
    setTimeout(() => {
      animationRef.current = requestAnimationFrame(scanQRCode);
    }, 2000);
  };

  // Stop Scanner
  const stopScanner = () => {
    setScanning(false);
    setCameraReady(false);
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    if (videoRef.current && videoRef.current.srcObject) {
      const stream = videoRef.current.srcObject as MediaStream;
      stream.getTracks().forEach(track => track.stop());
      videoRef.current.srcObject = null;
    }
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopScanner();
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col items-center p-4">
      {/* QR Code Generator */}
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md mb-6">
        <h2 className="text-xl font-bold mb-4">QR Code Generator</h2>
        <input
          type="text"
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          placeholder="Enter text or URL"
          className="w-full p-2 border rounded mb-4"
        />
        <button
          onClick={generateQRCode}
          className="w-full bg-blue-600 text-white py-2 rounded hover:bg-blue-700"
        >
          Generate QR Code
        </button>
        {qrCodeUrl && (
          <div className="mt-4 flex justify-center">
            <img src={qrCodeUrl} alt="QR Code" className="w-64 h-64" />
          </div>
        )}
      </div>

      {/* QR Code Scanner */}
      <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
        <h2 className="text-xl font-bold mb-4">QR Code Scanner</h2>

        <div className="relative w-full aspect-video overflow-hidden rounded-md border border-gray-300">
          <video
            ref={videoRef}
            className={`absolute top-0 left-0 w-full h-full object-cover ${scanning ? '' : 'hidden'}`}
            autoPlay
            muted
          />
          <canvas ref={canvasRef} className="hidden" />

          {/* Scanner Overlay */}
          {scanning && (
            <>
              <div className="absolute inset-0 border-4 border-green-400 rounded-md pointer-events-none z-10" />
              <div className="absolute top-0 left-0 w-full h-full z-20 pointer-events-none">
                <div className="absolute w-full h-1 bg-red-500 animate-scan-line" />
              </div>
            </>
          )}
        </div>

        {!scanning ? (
          <button
            onClick={startScanner}
            className="w-full bg-green-600 text-white py-2 rounded hover:bg-green-700 mt-2"
          >
            Start QR Scanner
          </button>
        ) : (
          <button
            onClick={stopScanner}
            className="w-full bg-red-600 text-white py-2 rounded hover:bg-red-700 mt-2"
          >
            Stop Scanner
          </button>
        )}

        {scanResult && (
          <div className="mt-4 text-gray-800 break-words">
            <strong>{scanResult}</strong>
          </div>
        )}
      </div>

      {/* Custom CSS */}
      <style jsx>{`
        @keyframes scanLine {
          0% {
            top: 0%;
          }
          100% {
            top: 100%;
          }
        }

        .animate-scan-line {
          animation: scanLine 2s linear infinite;
        }
      `}</style>
    </div>
  );
}
