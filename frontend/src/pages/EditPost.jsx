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

  const [clearedFields, setClearedFields] = useState({
    image: false,
    video: false,
    audio: false,
    pdf: false,
  });

  const [files, setFiles] = useState({
    image: null,
    video: null,
    audio: null,
    pdf: null,
  });

  const [previews, setPreviews] = useState({
    image: '',
    video: '',
    audio: '',
    pdf: '',
  });

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

      setPreviews({
        image: post.image || '',
        video: post.video || '',
        audio: post.audio || '',
        pdf: post.pdf || '',
      });
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
    const file = e.target.files[0];
    const type = e.target.name;
    if (!file) return;

    setFiles(prev => ({ ...prev, [type]: file }));
    setClearedFields(prev => ({ ...prev, [type]: false }));

    if (type === 'image') {
      const reader = new FileReader();
      reader.onloadend = () => {
        setPreviews(prev => ({ ...prev, [type]: reader.result }));
      };
      reader.readAsDataURL(file);
    } else {
      setPreviews(prev => ({ ...prev, [type]: file.name }));
    }
  };

  const removeFile = (type) => {
    setFiles(prev => ({ ...prev, [type]: null }));
    setPreviews(prev => ({ ...prev, [type]: '' }));
    setClearedFields(prev => ({ ...prev, [type]: true }));
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

      if (files.image) submitData.append('image', files.image);
      if (files.video) submitData.append('video', files.video);
      if (files.audio) submitData.append('audio', files.audio);
      if (files.pdf) submitData.append('pdf', files.pdf);

      if (clearedFields.image) submitData.append('clear_image', 'true');
      if (clearedFields.video) submitData.append('clear_video', 'true');
      if (clearedFields.audio) submitData.append('clear_audio', 'true');
      if (clearedFields.pdf) submitData.append('clear_pdf', 'true');

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
                  <span className="text-[10px] font-semibold text-text">Replace Image / Poster</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(PNG, JPG, JPEG, GIF, WEBP)</span>
                  <input type="file" name="image" accept="image/*, .png, .jpg, .jpeg, .gif, .webp" onChange={handleFileChange} className="hidden" />
                </label>

                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiVideo className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Replace Vid</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(MP4, WEBM, OGG)</span>
                  <input type="file" name="video" accept="video/*, .mp4, .webm, .ogg" onChange={handleFileChange} className="hidden" />
                </label>

                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiMusic className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Replace Audio</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(MP3, WAV, M4A, OGG, MPEG)</span>
                  <input type="file" name="audio" accept="audio/*, .mp3, .wav, .m4a, .ogg, .mpeg" onChange={handleFileChange} className="hidden" />
                </label>

                <label className="flex flex-col items-center justify-center p-3 rounded-xl border border-border bg-card cursor-pointer hover:border-primary/40 transition text-center">
                  <FiFileText className="text-xl text-gray-400 mb-1" />
                  <span className="text-[10px] font-semibold text-text">Replace PDF</span>
                  <span className="text-[8px] text-gray-400 mt-0.5">(PDF Only)</span>
                  <input type="file" name="pdf" accept="application/pdf, .pdf" onChange={handleFileChange} className="hidden" />
                </label>
              </div>

              {/* Attachments overview */}
              <div className="space-y-2">
                {Object.keys(files).map((type) => {
                  const file = files[type];
                  if (!file) return null;
                  return (
                    <div key={type} className="flex items-center justify-between bg-card px-3 py-2 rounded-xl border border-border">
                      <span className="text-xs text-text flex items-center gap-1.5 capitalize font-semibold">
                        <FiPaperclip className="text-gray-400" /> New {type}: {file.name}
                      </span>
                      <button type="button" onClick={() => removeFile(type)} className="text-gray-400 hover:text-red-500">
                        <FiX />
                      </button>
                    </div>
                  );
                })}
              </div>

              {/* Current or New Previews */}
              <div className="flex flex-wrap gap-4 mt-2">
                {previews.image && (
                  <div className="relative h-20 w-20 rounded-lg overflow-hidden border border-border flex items-center justify-center bg-bg">
                    <img 
                      src={getMediaUrl(previews.image)} 
                      alt="Image preview" 
                      className="h-full w-full object-cover" 
                    />
                    <button type="button" onClick={() => removeFile('image')} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full text-xs hover:bg-red-500">
                      <FiX />
                    </button>
                  </div>
                )}

                {previews.video && (
                  <div className="relative h-20 w-32 rounded-lg overflow-hidden border border-border flex flex-col items-center justify-center bg-bg p-2 text-center">
                    <FiVideo className="text-xl text-primary mb-1" />
                    <span className="text-[8px] text-text truncate w-full">{previews.video.split('/').pop()}</span>
                    <button type="button" onClick={() => removeFile('video')} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full text-xs hover:bg-red-500">
                      <FiX />
                    </button>
                  </div>
                )}

                {previews.audio && (
                  <div className="relative h-20 w-24 rounded-lg overflow-hidden border border-border flex flex-col items-center justify-center bg-bg p-2 text-center">
                    <FiMusic className="text-xl text-green-500 mb-1" />
                    <span className="text-[8px] text-text truncate w-full">{previews.audio.split('/').pop()}</span>
                    <button type="button" onClick={() => removeFile('audio')} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full text-xs hover:bg-red-500">
                      <FiX />
                    </button>
                  </div>
                )}

                {previews.pdf && (
                  <div className="relative h-20 w-24 rounded-lg overflow-hidden border border-border flex flex-col items-center justify-center bg-bg p-2 text-center">
                    <FiFileText className="text-xl text-red-500 mb-1" />
                    <span className="text-[8px] text-text truncate w-full">{previews.pdf.split('/').pop()}</span>
                    <button type="button" onClick={() => removeFile('pdf')} className="absolute top-1 right-1 p-0.5 bg-black/50 text-white rounded-full text-xs hover:bg-red-500">
                      <FiX />
                    </button>
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
