import os
import requests
from bs4 import BeautifulSoup
from youtube_transcript_api import YouTubeTranscriptApi
import yt_dlp
import fitz  # PyMuPDF

def extract_youtube_video_id(url: str) -> str:
    """Extract the video ID from a YouTube URL."""
    if "v=" in url:
        return url.split("v=")[1].split("&")[0]
    elif "youtu.be/" in url:
        return url.split("youtu.be/")[1].split("?")[0]
    return ""

def load_youtube_content(url: str, api_key: str = None) -> (str, dict):
    """Load content from a YouTube video URL."""
    video_id = extract_youtube_video_id(url)
    if not video_id:
        raise ValueError("Invalid YouTube URL")

    # Try getting transcript first
    try:
        ytt_api = YouTubeTranscriptApi()
        transcript_list = ytt_api.list(video_id)
        try:
            # Try to fetch manual english transcript
            transcript = transcript_list.find_transcript(['en', 'en-US', 'en-GB'])
        except:
            try:
                # Try to fetch auto-generated english transcript
                transcript = transcript_list.find_generated_transcript(['en'])
            except:
                # Fallback to the first available transcript and try translating to English
                transcript = next(iter(transcript_list))
                try:
                    if transcript.is_translatable:
                        transcript = transcript.translate('en')
                except:
                    pass
                    
        text = " ".join([t['text'] for t in transcript.fetch()])
        return text, {"method": "youtube_transcript_api", "video_id": video_id}
    except Exception as e:
        print(f"Could not get transcript via API, falling back to audio download: {e}")
        
        if not api_key:
             raise ValueError("No transcript available and no Gemini API key provided for fallback.")

        # Fallback to downloading audio and using Gemini API
        audio_file = f"tmp_{video_id}.m4a"
        ydl_opts = {
            'format': 'ba[ext=m4a]/ba/w', # fast direct download without ffmpeg conversion
            'outtmpl': audio_file,
        }

        try:
            with yt_dlp.YoutubeDL(ydl_opts) as ydl:
                ydl.download([url])
            
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            
            uploaded_file = genai.upload_file(path=audio_file)
            model = genai.GenerativeModel('gemini-2.0-flash')
            response = model.generate_content([
                uploaded_file, 
                "Carefully listen to this audio and provide a complete verbatim transcription of everything that is said. Do not summarize or explain, just output the exact words spoken."
            ])
            
            genai.delete_file(uploaded_file.name)
            os.remove(audio_file)
            return response.text, {"method": "gemini_fallback", "video_id": video_id}
        except Exception as fallback_e:
            if os.path.exists(audio_file):
                os.remove(audio_file)
            raise Exception(f"Failed to extract YouTube content: {fallback_e}")

def load_web_content(url: str) -> (str, dict):
    """Scrape text from a standard webpage or blog."""
    headers = {'User-Agent': 'Mozilla/5.0'}
    try:
        response = requests.get(url, headers=headers, timeout=10)
        response.raise_for_status()
        soup = BeautifulSoup(response.text, 'html.parser')
        
        # Remove script and style elements
        for script in soup(["script", "style", "nav", "footer", "header"]):
            script.decompose()
            
        text = soup.get_text(separator=' ', strip=True)
        return text, {"method": "beautifulsoup", "url": url}
    except Exception as e:
        raise Exception(f"Failed to scrape web content: {e}")

def load_pdf_content(file_path: str) -> (str, dict):
    """Extract text from a saved PDF file."""
    try:
        text = ""
        doc = fitz.open(file_path)
        for page in doc:
            text += page.get_text()
        doc.close()
        return text.strip(), {"method": "pymupdf", "pages": len(doc)}
    except Exception as e:
        raise Exception(f"Failed to extract PDF content: {e}")

def process_input(source_type: str, source: str, additional_kwargs: dict = None) -> (str, dict):
    """
    Main entry point for content loading.
    source_type: 'pdf' uses source as a file path.
    source_type: 'web', 'document', 'youtube' uses source as a URL.
    """
    kwargs = additional_kwargs or {}
    
    if source_type == "youtube":
        return load_youtube_content(source, api_key=kwargs.get("gemini_api_key"))
    elif source_type in ["web", "document"]:
        return load_web_content(source)
    elif source_type == "pdf":
        return load_pdf_content(source)
    else:
        raise ValueError(f"Unsupported source type: {source_type}")
