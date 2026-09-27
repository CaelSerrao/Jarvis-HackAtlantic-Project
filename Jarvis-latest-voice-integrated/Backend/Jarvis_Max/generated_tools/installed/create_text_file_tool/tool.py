# Copyright (c) Jarvis Tool Builder Agent
# Licensed under the MIT License

import os
import json
from pathlib import Path
from typing import Dict, Any


def create_text_file(
    file_path: str,
    content: str,
    encoding: str = "utf-8",
    overwrite: bool = True
) -> Dict[str, Any]:
    """
    Creates a text file with the specified content at the given path.
    
    Args:
        file_path (str): Path to the file to be created.
        content (str): Content to write to the file.
        encoding (str): File encoding (default: utf-8).
        overwrite (bool): Whether to overwrite the file if it exists (default: True).
        
    Returns:
        Dict[str, Any]: JSON-compatible response with success status, file path, and error (if any).
    """
    response = {"success": True, "file_path": file_path, "error": None}
    
    try:
        # Convert to Path object for cross-platform handling
        path = Path(file_path)
        
        # Ensure directory exists
        path.parent.mkdir(parents=True, exist_ok=True)
        
        # Handle overwrite logic
        if path.exists() and not overwrite:
            response["success"] = False
            response["error"] = f"File '{file_path}' already exists and overwrite=False."
            return response
        
        # Write content to file
        with open(path, "w", encoding=encoding) as file:
            file.write(content)
            
    except Exception as e:
        response["success"] = False
        response["error"] = str(e)
        
    return response