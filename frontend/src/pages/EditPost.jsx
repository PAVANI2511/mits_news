import React, { useEffect, useState, useCallback } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import MainLayout from '../layouts/MainLayout';
import Sidebar from '../components/Sidebar';
import { postsAPI, getMediaUrl } from '../services/api';
import {
  FiFileText, FiImage, FiVideo, FiMusic,
  FiMapPin, FiPaperclip, FiX
} from 'react-icons/fi';

const EditPost = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { isAuthenticated, user } = useSelector((state) => state.auth);

  const [formData, setFormData] = useState({
    caption: '',
    text: '',
    hashtags: '',
    location: '',
    music_url: '',
  });

  const [existingMedia, setExistingMedia] = useState([]);
  const [clearMediaIds, setClearMediaIds] = useState([]);

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
  const [fetching, setFetching] = useState(true);
  const [success, setSuccess] = useState('');

  useEffect(() => {
    if (!isAuthenticated) {
      window.location.href = '/login';
    }
  }, [isAuthenticated]);

  const loadPost = useCallback(async () => {
    setFetching(true);
    try {
      const res = await postsAPI.getDetail(id);
      const post = res.data;

      // Verify authority: must be owner or admin
      if (post.username !== user?.username && !user?.is_staff) {
        setError("You are not authorized to edit this post.");
        setFetching(false);
        return;
      }

      setFormData({
        caption: post.caption || '',
        text: post.text || '',
        hashtags: post.hashtags ? post.hashtags.map(t => `#${t}`).join(' ') : '',
        location: post.location || '',
        music_url: post.music_url || '',
      });

      setExistingMedia(post.media_files || []);
      setClearMediaIds([]);
    } catch (_err) {
      setError("Failed to fetch post details. It might have been deleted.");
    } finally {
      setFetching(false);
    }
  }, [id, user?.username, user?.is_staff]);

  useEffect(() => {
    if (isAuthenticated) {
      loadPost();
    }
  }, [isAuthenticated, loadPost]);

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

  const removeExistingMedia = (mediaId) => {
    setClearMediaIds(prev => [...prev, mediaId]);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess('');

    if (!formData.caption.trim() || !formData.text.trim()) {
      setError("Headline/Caption and Article details are required.");
      return;
    }

    setLoading(true);

    try {
      const submitData = new FormData();
      submitData.append('caption', formData.caption);
      submitData.append('text', formData.text);
      submitData.append('hashtags', formData.hashtags);
      submitData.append('location', formData.location);
      submitData.append('music_url', formData.music_url);

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

      if (clearMediaIds.length > 0) {
        clearMediaIds.forEach(id => submitData.append('clear_media_ids', id));
      }

      await postsAPI.update(id, submitData);
      setSuccess("Your campus article was successfully updated!");
      setTimeout(() => navigate('/feed'), 1500);
    } catch (err) {
      setError(err.response?.data?.detail || "An error occurred while saving updates.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <MainLayout sidebar={<Sidebar />}>
      <div className="bg-card rounded-2xl border border-border p-6 shadow-sm">
        <div className="border-b border-border pb-4 mb-6">
          <h2 className="text-xl font-extrabold text-text">Edit Article</h2>
          <p className="text-xs text-gray-500 mt-1">Modify details and publish changes to the newspaper</p>
        </div>

        {error && (
          <div className="mb-4 bg-red-50 border border-red-200 text-red-700 text-xs px-4 py-2.5 rounded-xl flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => navigate('/feed')} className="text-[10px] font-bold underline text-red-800">Back to feed</button>
          </div>
        )}

        {success && (
          <div className="mb-4 bg-green-50 border border-green-200 text-green-700 text-xs px-4 py-2.5 rounded-xl">
            {success}
          </div>
        )}

        {!fetching && !error && (
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                Caption *
              </label>
              <input
                type="text"
                name="caption"
                value={formData.caption}
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
                value={formData.text}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5">
                  Hashtags
                </label>
                <input
                  type="text"
                  name="hashtags"
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
                    value={formData.location}
                    onChange={handleChange}
                    className="w-full pl-10 pr-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
                  />
                  <FiMapPin className="absolute left-3.5 top-3.5 text-gray-400" />
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-bold text-gray-500 uppercase tracking-wider mb-1.5 flex items-center gap-1">
                <FiMusic /> Background Music URL
              </label>
              <input
                type="text"
                name="music_url"
                value={formData.music_url}
                onChange={handleChange}
                className="w-full px-4 py-3 rounded-2xl bg-bg border border-border focus:outline-none focus:ring-2 focus:ring-primary text-sm transition-all"
              />
            </div>

            <div className="border border-dashed border-border rounded-2xl p-4 bg-bg/20 space-y-4">
              <span className="block text-xs font-bold text-gray-500 uppercase tracking-wider">Update Campus Media</span>

              <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiImage className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Add Images</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(PNG, JPG, JPEG, GIF, WEBP - Max 10MB)</span>
                  <input type="file" name="images" multiple accept="image/*, .png, .jpg, .jpeg, .gif, .webp" onChange={handleFileChange} className="hidden" />
                </label>

                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiVideo className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Add Videos</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(MP4, WEBM, OGG - Max 50MB)</span>
                  <input type="file" name="videos" multiple accept="video/*, .mp4, .webm, .ogg" onChange={handleFileChange} className="hidden" />
                </label>

                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiMusic className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Set Audio</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(MP3, WAV, M4A, OGG, MPEG - Max 20MB, Max 1 file)</span>
                  <input type="file" name="audio" accept="audio/*, .mp3, .wav, .m4a, .ogg, .mpeg" onChange={handleFileChange} className="hidden" />
                </label>

                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiFileText className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Add PDFs</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(PDF Only - Max 20MB)</span>
                  <input type="file" name="pdfs" multiple accept="application/pdf, .pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {/* Existing Media List */}
              {existingMedia.filter(m => !clearMediaIds.includes(m.id)).length > 0 && (
                <div className="space-y-2">
                  <span className="block text-[10px] font-bold text-gray-400 uppercase">Currently Uploaded Media</span>
                  {existingMedia.filter(m => !clearMediaIds.includes(m.id)).map((m) => {
                    const fileName = m.file_url.split('/').pop().split('?')[0];
                    return (
                      <div key={m.id} className="flex items-center justify-between bg-card/60 px-3 py-2 rounded-xl border border-border/80">
                        <span className="text-xs text-text flex items-center gap-1.5 font-semibold truncate max-w-xs">
                          {m.media_type === 'image' && <FiImage className="text-blue-500" />}
                          {m.media_type === 'video' && <FiVideo className="text-primary" />}
                          {m.media_type === 'audio' && <FiMusic className="text-green-500" />}
                          {m.media_type === 'pdf' && <FiFileText className="text-red-500" />}
                          {decodeURIComponent(fileName)}
                        </span>
                        <button type="button" onClick={() => removeExistingMedia(m.id)} className="text-gray-400 hover:text-red-500 font-bold text-xs flex items-center gap-1">
                          <FiX /> Clear
                        </button>
                      </div>
                    );
                  })}
                </div>
              )}

              {/* New Attachments overview */}
              <div className="space-y-2">
                {/* Images */}
                {files.images.map((file, idx) => (
                  <div key={`img-${idx}`} className="flex items-center justify-between bg-card px-3 py-2 rounded-xl border border-border">
                    <span className="text-xs text-text flex items-center gap-1.5 font-semibold">
                      <FiPaperclip className="text-gray-400" /> New image {idx + 1}: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
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
                      <FiPaperclip className="text-gray-400" /> New video {idx + 1}: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
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
                      <FiPaperclip className="text-gray-400" /> New audio: {files.audio.name} ({(files.audio.size / (1024 * 1024)).toFixed(2)} MB)
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
                      <FiPaperclip className="text-gray-400" /> New pdf {idx + 1}: {file.name} ({(file.size / (1024 * 1024)).toFixed(2)} MB)
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
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">New Image Previews</span>
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
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">New Video Previews</span>
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
                    <span className="block text-[10px] font-bold text-gray-400 uppercase mb-2">New PDF Document Previews</span>
                    <div className="space-y-3">
                      {pdfPreviews.map((item, idx) => (
                        <div key={idx} className="relative border border-border rounded-xl p-3 bg-card flex flex-col gap-2">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-bold text-text truncate max-w-xs">{item.name}</span>
                            <button type="button" onClick={() => removeFile('pdfs', idx)} className="text-gray-400 hover:text-red-500 text-sm">
                              <FiX />
                            </button>
                          </div>
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

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3.5 bg-primary text-white rounded-2xl font-bold flex items-center justify-center gap-2 hover:bg-primary/95 shadow-lg shadow-primary/25 disabled:opacity-50 transition"
            >
              {loading ? 'Saving Changes...' : 'Save Article Changes'}
            </button>
          </form>
        )}

        {fetching && (
          <div className="py-12 text-center text-gray-500 flex flex-col items-center justify-center">
            <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin mb-2" />
            <span className="text-xs">Loading article details...</span>
          </div>
        )}
      </div>
    </MainLayout>
  );
};

export default EditPost;
