import React, { useState, useRef, useEffect } from 'react';
import { FilePond, registerPlugin } from 'react-filepond';
import 'filepond/dist/filepond.min.css';
import FilePondPluginImageExifOrientation from 'filepond-plugin-image-exif-orientation';
import FilePondPluginFileValidateType from 'filepond-plugin-file-validate-type';

// Register FilePond plugins exif orientation (to correct mobile image orientation) and type validation to prevent unwanted files
registerPlugin(
  FilePondPluginImageExifOrientation,
  FilePondPluginFileValidateType
);

const Uploader = () => {
  const [files, setFiles] = useState([]);
  const [results, setResults] = useState(null);
  const imageRef = useRef(null);
  const [scale, setScale] = useState({ x: 1, y: 1 });

  // Effect to update the scale of bounding boxes when the results change
  useEffect(() => {
    if (results && imageRef.current) {
       // Function to update the scale based on the displayed image size
      const updateScale = () => {
        const displayedWidth = imageRef.current.clientWidth;
        const displayedHeight = imageRef.current.clientHeight;
        const originalWidth = results.dimensions.width;
        const originalHeight = results.dimensions.height;

        setScale({
          x: displayedWidth / originalWidth,
          y: displayedHeight / originalHeight
        });
      };

      imageRef.current.onload = updateScale;
      updateScale();

      // Listen for window resize events to adjust the scale
      window.addEventListener('resize', updateScale);
      return () => window.removeEventListener('resize', updateScale);
    }
  }, [results]);

  // Handle file upload and detection process
  const handleProcessFile = async (fieldName, file, metadata, load, error) => {
    try {
      const formData = new FormData();
      formData.append('image', file);

      // Send the image to the backend for processing
      const response = await fetch('http://localhost:5000/detect', {
        method: 'POST',
        body: formData
      });

      if (!response.ok) throw new Error('Detection failed');

      const data = await response.json();
      setResults(data);
      load();
    } catch (err) {
      error('Failed to process file');
      console.error(err);
    }
  };

  // Component to render the bounding boxes around detected objects
  const BoundingBox = ({ detection }) => {
    const scaledBox = {
      left: detection.bbox.x1 * scale.x,
      top: detection.bbox.y1 * scale.y,
      width: (detection.bbox.x2 - detection.bbox.x1) * scale.x,
      height: (detection.bbox.y2 - detection.bbox.y1) * scale.y,
    };

    return (
      <div
        className="absolute border-2 border-green-500 pointer-events-none"
        style={{
          left: `${scaledBox.left}px`,
          top: `${scaledBox.top}px`,
          width: `${scaledBox.width}px`,
          height: `${scaledBox.height}px`,
        }}
      >
        <div className="absolute -top-7 left-0 bg-green-500 text-black px-2 py-1 text-sm whitespace-nowrap">
          {detection.class} ({detection.confidence}%)
        </div>
      </div>
    );
  };

  return (
    <div className="w-full max-w-screen-xl mx-auto p-4">
      <FilePond
        files={files}
        onupdatefiles={setFiles}
        acceptedFileTypes={['image/*']}
        maxFiles={1}
        credits={false}
        name="file"
        server={{
          process: handleProcessFile,
        }}
        labelIdle='Drag & Drop your image or <span class="filepond--label-action">Browse</span>'
      />

      {results && (
        <div className="relative inline-block w-full mt-4">
          <img
            ref={imageRef}
            src={`data:image/jpeg;base64,${results.image}`}
            alt="Analyzed"
            className="max-w-full h-auto rounded-lg shadow-lg"
          />
          {scale.x !== 1 && results.detections.map((detection, index) => (
            <BoundingBox key={index} detection={detection} />
          ))}
        </div>
      )}
    </div>
  );
};

export default Uploader;