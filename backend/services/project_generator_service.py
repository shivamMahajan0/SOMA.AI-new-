import os
import json
import uuid
import httpx
import shutil
from zipfile import ZipFile
from pydantic import ValidationError
from backend.models import GeneratedProjectDoc
from backend.mongo_db import get_db

GENERATED_PROJECTS_DIR = os.path.join("backend", "generated_projects")

# Ensure base directory exists
os.makedirs(GENERATED_PROJECTS_DIR, exist_ok=True)

async def generate_project_from_prompt(prompt: str) -> GeneratedProjectDoc:
    """
    Calls Gemini to generate a project structure, securely writes it to disk,
    zips it, and saves metadata to MongoDB.
    """
    api_key = os.getenv("GEMINI_API_KEY")
    if not api_key:
        raise Exception("GEMINI_API_KEY is not set.")

    # Request strict JSON structure from Gemini
    system_prompt = (
        "You are an expert software engineer and project generator.\\n"
        "Your task is to generate complete, runnable code for the requested project folder structure.\\n"
        "You MUST return ONLY a valid JSON object matching this exact schema:\\n"
        "{\\n"
        '  "project_name": "name_without_spaces",\\n'
        '  "structure": {\\n'
        '    "app.py": "code content here",\\n'
        '    "requirements.txt": "dependencies here",\\n'
        '    "README.md": "instructions here",\\n'
        '    "utils": {\\n'
        '      "helpers.py": "code content here"\\n'
        '    }\\n'
        '  }\\n'
        "}\\n"
        "DO NOT wrap the response in markdown code blocks like ```json. Return raw JSON.\\n"
        "Include a valid README.md and proper dependencies."
    )

    url = f"https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key={api_key}"
    headers = {"Content-Type": "application/json"}
    
    payload = {
        "contents": [
            {"parts": [{"text": f"{system_prompt}\\n\\nUser Request: {prompt}"}]}
        ],
        "generationConfig": {
            "responseMimeType": "application/json"
        }
    }

    async with httpx.AsyncClient() as client:
        response = await client.post(url, headers=headers, json=payload, timeout=90.0)
        if response.status_code != 200:
            raise Exception(f"Gemini API Error: {response.status_code} - {response.text}")
        
        data = response.json()
        try:
            llm_text = data["candidates"][0]["content"]["parts"][0]["text"]
        except (KeyError, IndexError):
            raise Exception("Invalid response format from Gemini.")

    # Parse JSON
    try:
        project_data = json.loads(llm_text)
    except json.JSONDecodeError:
        # In case it wrapped in markdown despite instructions
        if llm_text.startswith("```json"):
            llm_text = llm_text[7:].strip()
            if llm_text.endswith("```"):
                llm_text = llm_text[:-3].strip()
        try:
            project_data = json.loads(llm_text)
        except json.JSONDecodeError as e:
            raise Exception(f"Failed to parse LLM output as JSON: {str(e)}")

    project_name = project_data.get("project_name", "generated_project").replace(" ", "_")
    structure = project_data.get("structure", {})
    
    if not structure:
        raise Exception("LLM returned an empty project structure.")

    project_id = str(uuid.uuid4())
    project_dir = os.path.join(GENERATED_PROJECTS_DIR, project_id, project_name)
    
    # 2. Write to disk securely
    file_count = _write_structure(structure, project_dir)

    # 3. Create ZIP
    zip_filename = f"{project_name}.zip"
    zip_filepath = os.path.join(GENERATED_PROJECTS_DIR, project_id, zip_filename)
    
    _create_zip(project_dir, zip_filepath)

    # 4. Save to Mongo
    download_link = f"/api/project-generator/download/{project_id}"
    
    doc = GeneratedProjectDoc(
        id=project_id,
        project_name=project_name,
        user_prompt=prompt,
        file_count=file_count,
        download_link=download_link
    )
    
    db = get_db()
    db.generated_projects.insert_one(doc.dict())

    # We also return the raw structure so the UI can preview it
    return {
        "metadata": doc.dict(),
        "structure": structure
    }


def _write_structure(structure: dict, base_dir: str) -> int:
    """
    Recursively writes a dictionary structure to disk.
    Prevents path traversal by strictly working within base_dir.
    Returns the total number of files created.
    """
    os.makedirs(base_dir, exist_ok=True)
    count = 0
    
    for key, val in structure.items():
        # Sanitize key
        safe_key = os.path.basename(key) 
        if not safe_key or safe_key in ('.', '..'):
            continue
            
        target_path = os.path.join(base_dir, safe_key)
        
        if isinstance(val, dict):
            # It's a directory
            count += _write_structure(val, target_path)
        elif isinstance(val, str):
            # It's a file
            with open(target_path, "w", encoding="utf-8") as f:
                f.write(val)
            count += 1
            
    return count


def _create_zip(source_dir: str, zip_filepath: str):
    """
    Zips the contents of source_dir into zip_filepath.
    """
    with ZipFile(zip_filepath, 'w') as zipf:
        for root, dirs, files in os.walk(source_dir):
            for file in files:
                file_path = os.path.join(root, file)
                # Ensure the zip architecture is relative to the source_dir
                arcname = os.path.relpath(file_path, os.path.dirname(source_dir))
                zipf.write(file_path, arcname)


def get_project_zip_path(project_id: str) -> str:
    """Retrieve the path to the downloaded zip file"""
    db = get_db()
    doc = db.generated_projects.find_one({"id": project_id})
    if not doc:
        return None
        
    project_name = doc.get("project_name")
    zip_filepath = os.path.join(GENERATED_PROJECTS_DIR, project_id, f"{project_name}.zip")
    
    if os.path.exists(zip_filepath):
        return zip_filepath
    return None
