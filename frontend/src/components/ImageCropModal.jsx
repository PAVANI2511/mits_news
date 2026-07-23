import React, { useState, useCallback } from 'react';
import Cropper from 'react-easy-crop';
import getCroppedImg from '../utils/cropImage';

const ImageCropModal = ({ isOpen, imageSrc, onCancel, onSave }) => {
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState(null);
  const [loading, setLoading] = useState(false);

  const onCropComplete = useCallback((_croppedArea, croppedAreaPixels) => {
    setCroppedAreaPixels(croppedAreaPixels);
  }, []);

  const handleSave = async () => {
    if (!croppedAreaPixels || !imageSrc) return;
    setLoading(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onSave(croppedBlob);
    } catch (err) {
      console.error('Error cropping image:', err);
      alert('Failed to crop image. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset 0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="bg-card border border-border w-full max-w-md rounded-2xl overflow-hidden shadow-2xl flex flex-col animate-in fade-in zoom-in-95 duration-200">
        {/* Header */}
        <div className="p-4 border-b border-border">
          <h3 className="text-sm font-extrabold text-text uppercase tracking-wider">
            Crop Profile Picture
          </h3>
        </div>

        {/* Cropper area */}
        <div className="relative w-full h-80 bg-gray-900">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            aspect={1}
            cropShape="round"
            showGrid={false}
            onCropChange={setCrop}
            onCropComplete={onCropComplete}
            onZoomChange={setZoom}
          />
        </div>

        {/* Controls */}
        <div className="p-4 border-t border-border space-y-2">
          <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
            <span>Zoom</span>
            <span>{Math.round(zoom * 100)}%</span>
          </div>
          <input
            type="range"
            min={1}
            max={3}
            step={0.1}
            value={zoom}
            onChange={(e) => setZoom(parseFloat(e.target.value))}
            className="w-full accent-primary bg-bg rounded-lg cursor-pointer h-1.5"
          />
        </div>

        {/* Footer actions */}
        <div className="flex gap-3 p-4 bg-bg/30 border-t border-border">
          <button
            type="button"
            onClick={onCancel}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-bg hover:bg-border/50 text-gray-600 font-bold text-xs rounded-xl transition uppercase tracking-wider border border-border disabled:opacity-50"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={loading}
            className="flex-1 py-2.5 px-4 bg-primary hover:bg-primary/95 text-white font-bold text-xs rounded-xl transition uppercase tracking-wider shadow-md shadow-primary/10 disabled:opacity-50 flex items-center justify-center"
          >
            {loading ? 'Cropping...' : 'Save Crop'}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ImageCropModal;
