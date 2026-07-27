import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import { postsAPI } from '../services/api';
import { 
  FiFileText, FiImage, FiVideo, FiMusic, 
  FiMapPin, FiPaperclip, FiSend, FiX 
} from 'react-icons/fi';

const CreatePost = () => {
  const navigate = useNavigate();
  const { isAuthenticated } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    caption: '',
    text: '',
    hashtags: '',
    location: '',
    external_url: '',
    category_id: '',
    event_date: '',
    last_date: '',
  });

  const [categories, setCategories] = useState([]);

  const [files, setFiles] = useState({
    images: [],
    videos: [],
    audio: null,
    pdfs: [],
  });

  const [imagePreviews, setImagePreviews] = useState([]);
  const [videoPreviews, setVideoPreviews] = useState([]);
  const [pdfPreviews, setPdfPreviews] = useState([]);

  useEffect(() => {
    const urls = files.images.map(f => URL.createObjectURL(f));
    setImagePreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files.images]);

  useEffect(() => {
    const urls = files.videos.map(f => URL.createObjectURL(f));
    setVideoPreviews(urls);
    return () => urls.forEach(url => URL.revokeObjectURL(url));
  }, [files.videos]);

  useEffect(() => {
    const urls = files.pdfs.map(f => {
      return { name: f.name, url: URL.createObjectURL(f) };
    });
    setPdfPreviews(urls);
    return () => urls.forEach(item => URL.revokeObjectURL(item.url));
  }, [files.pdfs]);

  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [success, setSuccess] = useState('');
  const [isSubmitted, setIsSubmitted] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    } else {
      const loadCategories = async () => {
        try {
          const res = await postsAPI.getCategories();
          setCategories(res.data);
        } catch (err) {
          console.error("Failed to load categories:", err);
        }
      };
      loadCategories();
    }
  }, [isAuthenticated]);

  if (!isAuthenticated) {
    return null;
  }

  const handleChange = (e) => {
    setFormData(prev => ({ ...prev, [e.target.name]: e.target.value }));
  };

  const handleFileChange = (e) => {
    const inputFiles = Array.from(e.target.files);
    const type = e.target.name; // images, videos, audio, pdfs
    if (!inputFiles.length) return;

    setError('');

    const maxSizes = {
      images: 10 * 1024 * 1024,
      videos: 50 * 1024 * 1024,
      pdfs: 20 * 1024 * 1024,
      audio: 20 * 1024 * 1024,
    };

    const allowedExtensions = {
      images: ['.png', '.jpg', '.jpeg', '.gif', '.webp'],
      videos: ['.mp4', '.webm', '.ogg'],
      pdfs: ['.pdf'],
      audio: ['.mp3', '.wav', '.m4a', '.ogg', '.mpeg'],
    };

    const newValidFiles = [];

    for (const file of inputFiles) {
      const ext = '.' + file.name.split('.').pop().toLowerCase();
      if (!allowedExtensions[type].includes(ext)) {
        setError(`Invalid format: ${file.name}. Allowed formats for ${type} are ${allowedExtensions[type].join(', ')}.`);
        return;
      }
      if (file.size > maxSizes[type]) {
        const sizeLimitMB = maxSizes[type] / (1024 * 1024);
        setError(`File ${file.name} exceeds the size limit of ${sizeLimitMB}MB.`);
        return;
      }
      newValidFiles.push(file);
    }

    if (type === 'audio') {
      if (newValidFiles.length > 1) {
        setError("Only one audio file per post is allowed.");
        return;
      }
      setFiles(prev => ({ ...prev, audio: newValidFiles[0] }));
    } else {
      setFiles(prev => ({
        ...prev,
        [type]: [...prev[type], ...newValidFiles]
      }));
    }
  };

  const removeFile = (type, index) => {
    if (type === 'audio') {
      setFiles(prev => ({ ...prev, audio: null }));
    } else {
      setFiles(prev => ({
        ...prev,
        [type]: prev[type].filter((_, i) => i !== index)
      }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitted(true);
    setError('');
    setSuccess('');

    if (!formData.caption.trim() || !formData.text.trim()) {
      setError("Headline/Caption and Article details are required.");
      window.scrollTo({ top: 0, behavior: 'smooth' });
      return;
    }

    setLoading(true);
    try {
      const submitData = new FormData();
      submitData.append('caption', formData.caption);
      submitData.append('text', formData.text);
      submitData.append('hashtags', formData.hashtags);
      submitData.append('location', formData.location);
      submitData.append('external_url', formData.external_url);
      if (formData.category_id) submitData.append('category_id', formData.category_id);
      if (formData.event_date) submitData.append('event_date', formData.event_date);
      if (formData.last_date) submitData.append('last_date', formData.last_date);

      if (files.images && files.images.length > 0) {
        files.images.forEach(f => submitData.append('images', f));
      }
      if (files.videos && files.videos.length > 0) {
        files.videos.forEach(f => submitData.append('videos', f));
      }
      if (files.pdfs && files.pdfs.length > 0) {
        files.pdfs.forEach(f => submitData.append('pdfs', f));
      }
      if (files.audio) {
        submitData.append('audio', files.audio);
      }

      setUploadProgress(1);
      await postsAPI.create(submitData, {
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percentCompleted);
          }
        }
      });
      setSuccess("Your campus article was successfully published!");
      setTimeout(() => navigate('/feed'), 1500);
    } catch (err) {
      let errorMsg = "An error occurred while publishing the post.";
      if (err.response?.data) {
        const data = err.response.data;
        if (typeof data === 'string') {
          errorMsg = data;
        } else if (data.detail) {
          errorMsg = data.detail;
        } else if (data.error) {
          errorMsg = data.error;
        } else {
          const messages = Object.entries(data).map(([field, errs]) => {
            const fieldName = field.charAt(0).toUpperCase() + field.slice(1).replace('_', ' ');
            return `${fieldName}: ${Array.isArray(errs) ? errs.join(', ') : errs}`;
          });
          if (messages.length > 0) {
            errorMsg = messages.join(' | ');
          }
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      setError(errorMsg);
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="border-b border-border pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-text">Publish to Newspaper</h2>
          <p className="text-xs text-gray-500 mt-1">Publish an article or share campus media with other students</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl">
            {error}
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl">
            {success}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Caption *
            </label>
            <input
              type="text"
              name="caption"
              placeholder="Give your article a catchy headline..."
              value={formData.caption}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-2xl bg-bg border focus:outline-none focus:ring-2 text-sm transition-all ${
                isSubmitted && !formData.caption.trim()
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border focus:ring-primary'
              }`}
            />
            {isSubmitted && !formData.caption.trim() && (
              <p className="text-red-500 text-xs mt-1 font-medium">Caption is required.</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Category
            </label>
            <select
              name="category_id"
              value={formData.category_id}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all font-semibold"
            >
              <option value="">Select a category...</option>
              {categories.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
              Reference / Action Link URL
            </label>
            <input
              type="url"
              name="external_url"
              placeholder="e.g. https://mits.ac.in/registration-form"
              value={formData.external_url}
              onChange={handleChange}
              className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
              Article Text Content *
            </label>
            <textarea
              name="text"
              rows="5"
              placeholder="Write the details of your article here..."
              value={formData.text}
              onChange={handleChange}
              className={`w-full px-4 py-3 rounded-2xl bg-bg border focus:outline-none focus:ring-2 text-sm transition-all ${
                isSubmitted && !formData.text.trim()
                  ? 'border-red-500 focus:ring-red-500'
                  : 'border-border focus:ring-primary'
              }`}
            />
            {isSubmitted && !formData.text.trim() && (
              <p className="text-red-500 text-xs mt-1 font-medium">Article details are required.</p>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Hashtags
              </label>
              <input
                type="text"
                name="hashtags"
                placeholder="#cse #campusnews #event"
                value={formData.hashtags}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Location
              </label>
              <div className="relative">
                <input
                  type="text"
                  name="location"
                  placeholder="Block-A Seminar Hall"
                  value={formData.location}
                  onChange={handleChange}
                  className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                />
                <FiMapPin className="absolute left-3.5 top-3.5 text-gray-400" />
              </div>
            </div>
          </div>

          {/* Event Metadata (Optional) */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Event Date & Time
              </label>
              <input
                type="datetime-local"
                name="event_date"
                value={formData.event_date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all text-gray-500 font-semibold"
              />
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Last Date for Registration
              </label>
              <input
                type="datetime-local"
                name="last_date"
                value={formData.last_date}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all text-gray-500 font-semibold"
              />
            </div>
          </div>



          {/* Attaching Files Panel */}
          <div className="border border-dashed border-border rounded-2xl p-4 bg-bg/20 space-y-4">
            <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Attach Campus Media</span>
            
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {/* Image Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                <FiImage className="text-xl text-gray-400 mb-1" />
                <span className="text-[10px] font-semibold text-text">Image / Poster</span>
                <span className="text-[8px] text-gray-400 mt-0.5">(PNG, JPG, JPEG, GIF, WEBP - Max 10MB)</span>
                <input type="file" name="images" multiple accept="image/*, .png, .jpg, .jpeg, .gif, .webp" onChange={handleFileChange} className="hidden" />
              </label>

              {/* Video Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                <FiVideo className="text-xl text-gray-400 mb-1" />
                <span className="text-[10px] font-semibold text-text">Video</span>
                <span className="text-[8px] text-gray-400 mt-0.5">(MP4, WEBM, OGG - Max 50MB)</span>
                <input type="file" name="videos" multiple accept="video/*, .mp4, .webm, .ogg" onChange={handleFileChange} className="hidden" />
              </label>

              {/* Audio Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                <FiMusic className="text-xl text-gray-400 mb-1" />
                <span className="text-[10px] font-semibold text-text">Audio</span>
                <span className="text-[8px] text-gray-400 mt-0.5">(MP3, WAV, M4A, OGG, MPEG - Max 20MB, Max 1 file)</span>
                <input type="file" name="audio" accept="audio/*, .mp3, .wav, .m4a, .ogg, .mpeg" onChange={handleFileChange} className="hidden" />
              </label>

              {/* PDF Input */}
              <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                <FiFileText className="text-xl text-gray-400 mb-1" />
                <span className="text-[10px] font-semibold text-text">PDF Doc</span>
                <span className="text-[8px] text-gray-400 mt-0.5">(PDF Only - Max 20MB)</span>
                <input type="file" name="pdfs" multiple accept="application/pdf, .pdf" onChange={handleFileChange} className="hidden" />
              </label>
            </div>

            {/* List Attached files */}
            <div className="space-y-2">
              {/* Images */}
              {files.images.map((file, idx) => (
                <div key={`img-${idx}`} className="flex items-center justify-between bg-card px-3 py-2 rounded-xl border border-border">
                  <span className="text-xs text-text flex items-center gap-1.5 font-semibold">
                    <FiPaperclip className="text-gray-400" /> image {idx + 1}: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button type="button" onClick={() => removeFile('images', idx)} className="text-gray-400 hover:text-red-500">
                    <FiX />
                  </button>
                </div>
              ))}
              {/* Videos */}
              {files.videos.map((file, idx) => (
                <div key={`vid-${idx}`} className="flex items-center justify-between bg-card px-3 py-2 rounded-xl border border-border">
                  <span className="text-xs text-text flex items-center gap-1.5 font-semibold">
                    <FiPaperclip className="text-gray-400" /> video {idx + 1}: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button type="button" onClick={() => removeFile('videos', idx)} className="text-gray-400 hover:text-red-500">
                    <FiX />
                  </button>
                </div>
              ))}
              {/* Audio */}
              {files.audio && (
                <div className="flex items-center justify-between bg-card px-3 py-2 rounded-xl border border-border">
                  <span className="text-xs text-text flex items-center gap-1.5 font-semibold">
                    <FiPaperclip className="text-gray-400" /> audio: {files.audio.name} ({(files.audio.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button type="button" onClick={() => removeFile('audio')} className="text-gray-400 hover:text-red-500">
                    <FiX />
                  </button>
                </div>
              )}
              {/* PDFs */}
              {files.pdfs.map((file, idx) => (
                <div key={`pdf-${idx}`} className="flex items-center justify-between bg-card px-3 py-2 rounded-xl border border-border">
                  <span className="text-xs text-text flex items-center gap-1.5 font-semibold">
                    <FiPaperclip className="text-gray-400" /> pdf {idx + 1}: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
                  </span>
                  <button type="button" onClick={() => removeFile('pdfs', idx)} className="text-gray-400 hover:text-red-500">
                    <FiX />
                  </button>
                </div>
              ))}
            </div>

            {/* Previews Panel */}
            <div className="space-y-4">
              {/* Image Previews */}
              {imagePreviews.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Image Previews</span>
                  <div className="flex flex-wrap gap-3">
                    {imagePreviews.map((url, idx) => (
                      <div key={idx} className="relative h-20 w-20 rounded-lg overflow-hidden border border-border bg-card">
                        <img src={url} alt={`Upload preview ${idx}`} className="h-full w-full object-cover" />
                        <button type="button" onClick={() => removeFile('images', idx)} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full text-xs">
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Video Previews */}
              {videoPreviews.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">Video Previews</span>
                  <div className="flex flex-wrap gap-3">
                    {videoPreviews.map((url, idx) => (
                      <div key={idx} className="relative h-28 w-44 rounded-lg overflow-hidden border border-border bg-black">
                        <video src={url} controls className="h-full w-full object-contain" />
                        <button type="button" onClick={() => removeFile('videos', idx)} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full text-xs z-10">
                          <FiX />
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* PDF Previews */}
              {pdfPreviews.length > 0 && (
                <div>
                  <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">PDF Document Previews</span>
                  <div className="space-y-3">
                    {pdfPreviews.map((item, idx) => (
                      <div key={idx} className="relative border border-border rounded-xl p-3 bg-card flex flex-col gap-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-bold text-text truncate max-w-xs">{item.name}</span>
                          <button type="button" onClick={() => removeFile('pdfs', idx)} className="text-gray-400 hover:text-red-500 text-sm">
                            <FiX />
                          </button>
                        </div>
                        {/* Inline scrollable PDF preview using iframe */}
                        <div className="w-full h-80 rounded-lg overflow-hidden border border-border">
                          <iframe src={`${item.url}#toolbar=0&navpanes=0`} className="w-full h-full" title={`PDF Preview ${idx}`} />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          {loading && uploadProgress > 0 && (
            <div className="w-full bg-bg/50 border border-border p-4 rounded-2xl flex flex-col gap-2 animate-fadeIn mt-4">
              <div className="flex justify-between items-center text-xs font-bold text-gray-500 uppercase tracking-wider">
                <span>Uploading campus media...</span>
                <span>{uploadProgress}%</span>
              </div>
              <div className="w-full bg-border rounded-full h-2 overflow-hidden">
                <div 
                  className="bg-primary h-full rounded-full transition-all duration-300 ease-out" 
                  style={{ width: `${uploadProgress}%` }}
                />
              </div>
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 shadow-lg shadow-primary/25 hover:shadow-primary/35 disabled:opacity-50 transition-all mt-4"
          >
            <FiSend /> {loading ? 'Publishing Article...' : 'Publish Campus News'}
          </button>
        </form>
      </div>
    </MainLayout>
  );
};

export default CreatePost;
