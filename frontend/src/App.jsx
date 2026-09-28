import React, { useState, useEffect, useRef } from 'react';
import { 
  Activity, 
  UploadCloud, 
  Music, 
  Play, 
  Pause, 
  CheckCircle2, 
  AlertCircle, 
  BarChart3, 
  Sliders, 
  Volume2, 
  Cpu, 
  Layers, 
  Sparkles,
  RefreshCw
} from 'lucide-react';
import './App.css';

const API_BASE = "http://127.0.0.1:8000";

function App() {
  const [file, setFile] = useState(null);
  const [audioUrl, setAudioUrl] = useState(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [topK, setTopK] = useState(10);
  const [threshold, setThreshold] = useState(0.01);
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState(null);
  const [systemStatus, setSystemStatus] = useState({ online: false, checking: true });
  
  const audioRef = useRef(null);
  const fileInputRef = useRef(null);

  // Check backend server health
  const checkHealth = async () => {
    try {
      const res = await fetch(`${API_BASE}/api/health`);
      if (res.ok) {
        const data = await res.json();
        setSystemStatus({ online: true, data, checking: false });
      } else {
        setSystemStatus({ online: false, checking: false });
      }
    } catch (e) {
      setSystemStatus({ online: false, checking: false });
    }
  };

  useEffect(() => {
    checkHealth();
    const interval = setInterval(checkHealth, 6000);
    return () => clearInterval(interval);
  }, []);

  const handleFileChange = (selectedFile) => {
    if (!selectedFile) return;
    setFile(selectedFile);
    setError(null);
    setResults(null);
    const url = URL.createObjectURL(selectedFile);
    setAudioUrl(url);
    setIsPlaying(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileChange(e.dataTransfer.files[0]);
    }
  };

  const togglePlay = () => {
    if (!audioRef.current) return;
    if (isPlaying) {
      audioRef.current.pause();
      setIsPlaying(false);
    } else {
      audioRef.current.play();
      setIsPlaying(true);
    }
  };

  const handlePredict = async () => {
    if (!file) return;
    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append("file", file);
    formData.append("top_k", topK);
    formData.append("threshold", threshold);

    try {
      const res = await fetch(`${API_BASE}/api/predict`, {
        method: "POST",
        body: formData,
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({ detail: "Dự đoán thất bại" }));
        throw new Error(errData.detail || "Không thể xử lý âm thanh");
      }

      const data = await res.json();
      setResults(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // Quick load sample wav from repo resources
  const loadDemoAudio = async () => {
    try {
      setLoading(true);
      setError(null);
      // Fetch test wav file
      const response = await fetch('/sample_audio.wav');
      if (!response.ok) {
        throw new Error("Không tìm thấy file mẫu demo");
      }
      const blob = await response.blob();
      const demoFile = new File([blob], "R9_ZSCveAHg_7s.wav", { type: "audio/wav" });
      handleFileChange(demoFile);
    } catch (e) {
      setError("Hãy chọn file âm thanh .wav hoặc .mp3 từ máy tính của bạn.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      {/* Header */}
      <header className="app-header">
        <div className="brand-wrapper">
          <div className="brand-icon">
            <Activity size={28} />
          </div>
          <div>
            <h1 className="brand-title">PANNs Audio Recognition</h1>
            <p className="brand-subtitle">Pretrained Audio Neural Networks (AudioSet 527 Sound Classes)</p>
          </div>
        </div>

        <div className="system-status-badge glass-panel">
          <span className={`status-dot ${systemStatus.online ? 'online' : 'offline'}`}></span>
          <span style={{ fontSize: '13px' }}>
            {systemStatus.checking 
              ? "Đang kết nối backend..." 
              : systemStatus.online 
                ? `Hệ thống sẵn sàng (${systemStatus.data?.device?.toUpperCase() || 'CPU'})` 
                : "Backend Offline"}
          </span>
          <button 
            onClick={checkHealth} 
            title="Làm mới trạng thái" 
            style={{ background: 'none', border: 'none', color: 'var(--text-dim)', cursor: 'pointer', display: 'flex' }}
          >
            <RefreshCw size={14} />
          </button>
        </div>
      </header>

      {/* Main Grid */}
      <main className="main-grid">
        {/* Left Column: Upload & Controls */}
        <section className="glass-panel section-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <UploadCloud size={18} color="var(--primary)" /> Tải File Âm Thanh
            </h2>
          </div>

          {/* Drag & Drop Area */}
          <div 
            className="dropzone"
            onClick={() => fileInputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={handleDrop}
          >
            <input 
              type="file" 
              ref={fileInputRef}
              accept="audio/*,.wav,.mp3,.flac,.ogg,.m4a"
              style={{ display: 'none' }}
              onChange={(e) => e.target.files && handleFileChange(e.target.files[0])}
            />
            <Volume2 className="dropzone-icon" />
            <div>
              <div className="dropzone-text-main">Kéo & thả âm thanh hoặc click để chọn</div>
              <div className="dropzone-text-sub">Hỗ trợ WAV, MP3, FLAC, OGG (Tối ưu: 32kHz)</div>
            </div>
          </div>

          {/* Selected File Card & Audio Player */}
          {file && (
            <div className="selected-file-card">
              <div className="file-info-row">
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <Music size={16} color="var(--accent-cyan)" />
                  <span className="file-name">{file.name}</span>
                </div>
                <span className="file-size font-mono">{(file.size / 1024).toFixed(1)} KB</span>
              </div>

              {audioUrl && (
                <div style={{ marginTop: '4px' }}>
                  <audio 
                    ref={audioRef} 
                    src={audioUrl} 
                    controls 
                    onEnded={() => setIsPlaying(false)}
                    style={{ width: '100%' }}
                  />
                </div>
              )}
            </div>
          )}

          {/* Parameter Sliders */}
          <div className="controls-row">
            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="control-label">Top dự đoán</label>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{topK}</span>
              </div>
              <input 
                type="range" 
                min="3" 
                max="25" 
                value={topK} 
                className="input-slider"
                onChange={(e) => setTopK(Number(e.target.value))}
              />
            </div>

            <div className="control-group">
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <label className="control-label">Ngưỡng lọc (Min)</label>
                <span className="font-mono" style={{ fontSize: '12px', color: 'var(--accent-cyan)' }}>{threshold}</span>
              </div>
              <input 
                type="range" 
                min="0.0" 
                max="0.5" 
                step="0.01" 
                value={threshold} 
                className="input-slider"
                onChange={(e) => setThreshold(Number(e.target.value))}
              />
            </div>
          </div>

          {/* Run Inference Button */}
          <button 
            className="btn-primary"
            onClick={handlePredict}
            disabled={!file || loading || !systemStatus.online}
          >
            {loading ? (
              <>
                <RefreshCw size={18} className="animate-spin" /> Đang phân tích mô hình CNN14...
              </>
            ) : (
              <>
                <Sparkles size={18} /> Phân Tích & Phân Loại Âm Thanh
              </>
            )}
          </button>

          {error && (
            <div style={{ padding: '12px', background: 'rgba(244, 63, 94, 0.1)', border: '1px solid var(--accent-rose)', borderRadius: 'var(--radius-sm)', display: 'flex', gap: '8px', alignItems: 'center', fontSize: '13px', color: '#fca5a5' }}>
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* Demo Audio Quick Test */}
          <div style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
            <span style={{ fontSize: '12px', color: 'var(--text-dim)', marginBottom: '8px', display: 'block' }}>
              Dữ liệu mẫu kiểm thử có sẵn:
            </span>
            <div className="samples-list">
              <div className="sample-chip" onClick={loadDemoAudio}>
                <span>🎵 R9_ZSCveAHg_7s.wav (Speech & Telephone Bell)</span>
                <span style={{ color: 'var(--primary)', fontSize: '12px' }}>Dùng mẫu</span>
              </div>
            </div>
          </div>
        </section>

        {/* Right Column: Prediction Results */}
        <section className="glass-panel section-panel">
          <div className="panel-header">
            <h2 className="panel-title">
              <BarChart3 size={18} color="var(--accent-cyan)" /> Kết Quả Phân Tích Tagging (AudioSet)
            </h2>
            {results && (
              <span className="badge-rank" style={{ background: 'var(--accent-emerald)', color: 'white' }}>
                Hoàn tất
              </span>
            )}
          </div>

          {results ? (
            <div className="predictions-container">
              {/* Meta Stats Row */}
              <div className="meta-stats-row">
                <div className="stat-box">
                  <div className="stat-label">Thời lượng</div>
                  <div className="stat-val font-mono">{results.duration_seconds}s</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Tần số mẫu</div>
                  <div className="stat-val font-mono">{results.sample_rate} Hz</div>
                </div>
                <div className="stat-box">
                  <div className="stat-label">Vector Embedding</div>
                  <div className="stat-val font-mono">2048 dims</div>
                </div>
              </div>

              {/* Waveform Preview */}
              {results.waveform_preview && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  <span style={{ fontSize: '11px', color: 'var(--text-dim)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Dạng sóng biên độ (Waveform)
                  </span>
                  <div className="waveform-container">
                    {results.waveform_preview.map((val, idx) => {
                      const heightPercent = Math.max(10, Math.min(100, Math.abs(val) * 160));
                      return (
                        <div 
                          key={idx} 
                          className="waveform-bar" 
                          style={{ height: `${heightPercent}%` }}
                          title={`Sample ${idx}: ${val}`}
                        />
                      );
                    })}
                  </div>
                </div>
              )}

              {/* List of Predictions */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '10px' }}>
                <span style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-muted)' }}>
                  Các nhãn âm thanh nhận diện được:
                </span>
                {results.predictions.map((item, index) => {
                  const isTop = index === 0;
                  return (
                    <div 
                      key={index} 
                      className={`prediction-item ${isTop ? 'top-rank' : ''}`}
                    >
                      <div className="item-row">
                        <div className="label-title">
                          <span className="badge-rank">#{index + 1}</span>
                          <span>{item.label}</span>
                        </div>
                        <div className="score-text font-mono">
                          {item.percentage}% <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>({item.score})</span>
                        </div>
                      </div>
                      <div className="progress-track">
                        <div 
                          className="progress-fill" 
                          style={{ 
                            width: `${Math.min(100, item.percentage)}%`,
                            background: isTop 
                              ? 'linear-gradient(90deg, #6366f1, #06b6d4)' 
                              : 'rgba(99, 102, 241, 0.6)'
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          ) : (
            <div className="empty-state">
              <Layers className="empty-icon" />
              <div style={{ fontSize: '16px', fontWeight: '500', color: 'var(--text-muted)' }}>
                Chưa có dữ liệu phân tích
              </div>
              <p style={{ fontSize: '13px', maxWidth: '380px' }}>
                Hãy tải lên file âm thanh (.wav, .mp3) hoặc chọn file mẫu bên trái và nhấn <b>"Phân Tích & Phân Loại Âm Thanh"</b> để xem các nhãn được nhận diện.
              </p>
            </div>
          )}
        </section>
      </main>
    </div>
  );
}

export default App;
