import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { uploadPdfVideo, getPdfVideoStatus } from '../api';

const AVATARS = [
    { id: 1, name: 'Maya', img: 'M' },
    { id: 2, name: 'James', img: 'J' },
    { id: 3, name: 'Elena', img: 'E' },
    { id: 4, name: 'Marcus', img: 'M' }
];

export default function PdfVideoCreate() {
    const navigate = useNavigate();
    const fileRef = useRef(null);
    const [file, setFile] = useState(null);
    const [fileId, setFileId] = useState(null);
    const [status, setStatus] = useState('idle'); // idle, uploading, processing, completed, failed
    const [videoUrl, setVideoUrl] = useState(null);
    const [progress, setProgress] = useState(0);
    const [error, setError] = useState('');
    
    // Config State
    const [name , setName] = useState(null);//default
    const [avatar, setAvatar] = useState(3); // Default Elena
    const [voice, setVoice] = useState('Neural Text-To-Speech (English-US)');
    const [pacing, setPacing] = useState(1.0);
    const [bgStyle, setBgStyle] = useState('Corporate Abstract');
    const [resolution, setResolution] = useState('1080p');

    useEffect(() => {
        const stored = localStorage.getItem('user');
        if (!stored) navigate('/login');
    }, [navigate]);

    const handleFileDrop = (e) => {
        e.preventDefault();
        const f = e.dataTransfer?.files[0] || e.target.files[0];
        if (f && (f.name.toLowerCase().endsWith('.pdf') || f.name.toLowerCase().endsWith('.docx'))) {
            setFile(f);
            setError('');
            setStatus('idle');
            setProgress(0);
            
            // Simulate fake progress for "Analyzing document structure"
            let p = 0;
            const int = setInterval(() => {
                p += 5;
                if (p <= 45) {
                    setProgress(p);
                } else {
                    clearInterval(int);
                }
            }, 100);
        } else {
            setError('Please upload a valid PDF or DOCX document');
        }
    };

    const handleGenerate = async () => {
        if (!file) return setError('Please upload a document first');

        setStatus('uploading');
        setProgress(50);
        setError('');
        
        try {
            // Uncomment to use real API
            /*
            const fd = new FormData();
            fd.append('file', file);
            const res = await uploadPdfVideo(fd);
            setFileId(res.data.fileId);
            */
           
            // Fake progression
            setTimeout(() => {
                setStatus('processing');
                setProgress(80);
                setTimeout(() => {
                    setStatus('completed');
                    setProgress(100);
                    // Fake video output trigger
                    setVideoUrl('fake.mp4'); 
                }, 3000);
            }, 2000);
            
        } catch (e) {
             setError(e.response?.data?.detail || 'Upload failed');
             setStatus('failed');
        }
    };

    return (
        <div className="page-container" style={{ maxWidth: 1200, display: 'flex', gap: '2.5rem', alignItems: 'flex-start' }}>
            
            {/* Left Main Content */}
            <div style={{ flex: '1', display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                <div>
                    <h1 style={{ fontSize: '2rem', fontWeight: 800, marginBottom: '0.5rem', color: 'var(--text-primary)' }}>
                        Document to Video Generation
                    </h1>
                    <p style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>
                        Upload your presentation or report and our neural engine will synthesize a professional video presentation.
                    </p>
                </div>

                {error && (
                    <div style={{ padding: '1rem', background: 'rgba(239,83,80,0.1)', border: '1px solid var(--accent-red)', borderRadius: 'var(--radius-md)', color: 'var(--accent-red)' }}>
                        {error}
                    </div>
                )}

                {/* Upload Zone */}
                <div 
                    className={`upload-zone ${file ? 'active' : ''}`} 
                    style={{ 
                        padding: '4rem 2rem', 
                        background: 'transparent',
                        borderColor: file ? 'var(--primary)' : 'var(--border-dashed)',
                        borderWidth: '2px',
                        borderStyle: 'dashed',
                        borderRadius: 'var(--radius-xl)',
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '1rem',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                    onClick={() => fileRef.current?.click()}
                    onDrop={handleFileDrop}
                    onDragOver={e => e.preventDefault()}
                >
                    <div style={{ width: 64, height: 64, background: 'var(--bg-elevated)', borderRadius: '16px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '2rem', border: '1px solid var(--border)' }}>
                        📄
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <h3 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '0.25rem' }}>Drag and drop your PDF or DOCX file here</h3>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem' }}>Maximum file size 500MB</p>
                    </div>
                    <button className="btn btn-secondary" style={{ marginTop: '1rem', pointerEvents: 'none' }}>
                        Browse Files
                    </button>
                    <input
                        ref={fileRef}
                        type="file"
                        accept=".pdf,.docx"
                        style={{ display: 'none' }}
                        onChange={handleFileDrop}
                    />
                </div>

                {/* Active Document Card */}
                {file && (
                    <div>
                        <h3 style={{ fontSize: '0.9rem', fontWeight: 600, color: 'var(--text-primary)', marginBottom: '1rem' }}>Active Document</h3>
                        <div style={{ background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', padding: '1.25rem' }}>
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem' }}>
                                <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                                    <div style={{ width: 40, height: 40, background: 'rgba(239, 83, 80, 0.1)', color: '#EF5350', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '1.2rem' }}>
                                        📄
                                    </div>
                                    <div>
                                        <h4 style={{ fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-primary)' }}>{file.name}</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{(file.size / 1024 / 1024).toFixed(2)} MB</p>
                                    </div>
                                </div>
                                <button 
                                    style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', padding: '0.25rem' }}
                                    onClick={() => { setFile(null); setProgress(0); setStatus('idle'); }}
                                >
                                    ✕
                                </button>
                            </div>
                            
                            {/* Analysis Progress */}
                            <div>
                                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.5rem', color: 'var(--text-secondary)' }}>
                                    <span>Analyzing document structure...</span>
                                    <span>{progress}%</span>
                                </div>
                                <div style={{ height: 6, width: '100%', background: 'var(--bg-input)', borderRadius: 3, overflow: 'hidden' }}>
                                    <div style={{ height: '100%', width: `${progress}%`, background: 'var(--primary)', transition: 'width 0.3s ease' }}></div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Right Config Sidebar */}
            <div style={{ width: 380, flexShrink: 0, background: 'var(--bg-card)', border: '1px solid var(--border)', borderRadius: 'var(--radius-xl)', display: 'flex', flexDirection: 'column', overflow: 'hidden' }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.1rem', fontWeight: 600, color: 'var(--text-primary)' }}>Render Configuration</h2>
                </div>

                <div style={{ padding: '1.5rem', flex: 1, display: 'flex', flexDirection: 'column', gap: '1.5rem', overflowY: 'auto' }}>
                    
                    {/* Avatar Selection */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Avatar Selection</label>
                        <div style={{ display: 'flex', gap: '1rem' }}>
                            {AVATARS.map(a => (
                                <div 
                                    key={a.id} 
                                    onClick={() => setAvatar(a.id)}
                                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '0.5rem', cursor: 'pointer' }}
                                >
                                    <div style={{ 
                                        width: 56, 
                                        height: 56, 
                                        borderRadius: '50%', 
                                        background: avatar === a.id ? 'var(--primary)' : 'var(--bg-input)', 
                                        border: `2px solid ${avatar === a.id ? 'var(--primary)' : 'transparent'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: '#fff',
                                        fontSize: '1.2rem',
                                        fontWeight: 'bold',
                                        transition: 'all 0.2s',
                                        padding: 2
                                    }}>
                                        <div style={{ width: '100%', height: '100%', background: 'var(--bg-elevated)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            {a.img}
                                        </div>
                                    </div>
                                    <span style={{ fontSize: '0.75rem', color: avatar === a.id ? 'var(--text-primary)' : 'var(--text-muted)', fontWeight: avatar === a.id ? 600 : 400 }}>{a.name}</span>
                                </div>
                            ))}
                        </div>
                    </div>

                    {/* Voice Module */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Voice Module</label>
                        <select className="form-select" value={voice} onChange={e => setVoice(e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <option>Neural Text-To-Speech (English-US)</option>
                            <option>Neural Text-To-Speech (English-UK)</option>
                        </select>
                    </div>

                    {/* Pacing */}
                    <div>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                            <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Pacing</label>
                            <span style={{ fontSize: '0.85rem', color: 'var(--primary)', fontWeight: 600 }}>{pacing.toFixed(1)}x</span>
                        </div>
                        <input 
                            type="range" 
                            min="0.5" 
                            max="2.0" 
                            step="0.1" 
                            value={pacing} 
                            onChange={e => setPacing(parseFloat(e.target.value))}
                            style={{ width: '100%', accentColor: 'var(--primary)' }}
                        />
                    </div>

                    {/* Background Style */}
                    <div className="form-group" style={{ marginBottom: 0 }}>
                        <label style={{ fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)' }}>Background Style</label>
                        <select className="form-select" value={bgStyle} onChange={e => setBgStyle(e.target.value)} style={{ background: 'var(--bg-input)', border: '1px solid var(--border)' }}>
                            <option>Corporate Abstract</option>
                            <option>Minimal Dark</option>
                            <option>Studio Light</option>
                        </select>
                    </div>

                    {/* Output Resolution */}
                    <div>
                        <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.75rem' }}>Output Resolution</label>
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                            {['1080p', '4K', 'Portrait (9:16)'].map(res => (
                                <button 
                                    key={res}
                                    onClick={() => setResolution(res)}
                                    style={{ 
                                        flex: res === 'Portrait (9:16)' ? 2 : 1, 
                                        padding: '0.6rem', 
                                        background: resolution === res ? 'rgba(157, 114, 255, 0.15)' : 'var(--bg-input)', 
                                        border: `1px solid ${resolution === res ? 'var(--primary)' : 'var(--border)'}`, 
                                        borderRadius: 'var(--radius-md)',
                                        color: resolution === res ? 'var(--primary)' : 'var(--text-secondary)',
                                        fontSize: '0.8rem',
                                        fontWeight: 500,
                                        cursor: 'pointer',
                                        transition: 'all 0.2s'
                                    }}
                                >
                                    {res}
                                </button>
                            ))}
                        </div>
                    </div>

                </div>

                <div style={{ padding: '1.5rem', borderTop: '1px solid var(--border)', background: 'var(--bg-elevated)' }}>
                    <button 
                        className="btn btn-primary btn-lg" 
                        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem', padding: '1rem', fontWeight: 600 }}
                        onClick={handleGenerate}
                        disabled={!file || status === 'uploading' || status === 'processing'}
                    >
                        {status === 'processing' || status === 'uploading' ? (
                            'Rendering...'
                        ) : (
                            <>
                                <span>🎥</span> Render Video
                            </>
                        )}
                    </button>
                    {!file && <p style={{ textAlign: 'center', fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.75rem' }}>Please upload a document to unlock render options</p>}
                </div>
            </div>

            {/* Render Complete Overlay / Modal (Optional, just replacing the view here) */}
            {status === 'completed' && videoUrl && (
                <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.8)', zIndex: 1000, display: 'flex', alignItems: 'center', justifyContent: 'center', backdropFilter: 'blur(5px)' }}>
                     <div className="card" style={{ width: 800, padding: '2rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                            <h2 style={{ fontSize: '1.2rem', color: 'var(--text-primary)' }}>GenAI Video Ready</h2>
                            <button onClick={() => setStatus('idle')} style={{ background: 'none', border: 'none', color: 'var(--text-muted)', cursor: 'pointer', fontSize: '1.2rem' }}>✕</button>
                        </div>
                        <div style={{ background: '#000', borderRadius: 'var(--radius-md)', aspectRatio: '16/9', display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
                            [ Video Player Output ]
                        </div>
                        <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '1rem' }}>
                             <button className="btn btn-secondary" onClick={() => setStatus('idle')}>Close</button>
                             <button className="btn btn-primary" onClick={() => alert('Downloading...')}>Download Video</button>
                        </div>
                     </div>
                </div>
            )}
        </div>
    );
}
