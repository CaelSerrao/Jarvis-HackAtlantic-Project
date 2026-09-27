# Copyright © 2023 Jarvis Tool Builder
# Licensed under the MIT License.

"""
Tool for creating ZIP archives from source directories.
"""

import json
import os
import pathlib
from pathlib import Path
from typing import Dict, List, Optional, Union
from zipfile import ZIP_DEFLATED, ZIP_STORED, ZipFile
import fnmatch


def create_zip_archive(
    source_path: str,
    destination_path: str,
    exclude_patterns: Optional[List[str]] = None,
    compression: str = "deflated"
) -> Dict[str, Union[bool, str, List[str], Dict[str, str]]]:
    """
    Create a ZIP archive from a source directory.
    
    Args:
        source_path: Path to the source directory to archive.
        destination_path: Path to the output ZIP file.
        exclude_patterns: List of glob patterns to exclude from the archive.
        compression: Compression method for the archive.
                   Supported values: "deflated" (default), "stored".
    
    Returns:
        A dictionary containing:
        - success: bool
        - message: str
        - files_count: int
        - created_files: List[str] (relative paths inside the archive)
        - error: Optional[str] (if any)
    """
    result = {
        "success": False,
        "message": "",
        "files_count": 0,
        "created_files": [],
        "error": None
    }
    
    try:
        # Resolve paths
        source_path = Path(source_path).resolve()
        destination_path = Path(destination_path).resolve()
        
        # Validate source directory
        if not source_path.is_dir():
            result["error"] = f"Source path '{source_path}' is not a directory."
            return result
        
        # Validate destination parent
        destination_parent = destination_path.parent
        if destination_parent and not destination_parent.exists():
            result["error"] = f"Destination parent directory '{destination_parent}' does not exist."
            return result
        
        # Initialize exclude patterns
        exclude_patterns = exclude_patterns or []
        
        # Open ZIP file for writing
        with ZipFile(destination_path, "w", compression=ZIP_DEFLATED if compression == "deflated" else ZIP_STORED) as zipf:
            # Walk through source directory
            for root, _, files in os.walk(source_path):
                for file in files:
                    file_path = Path(root) / file
                    relative_path = file_path.relative_to(source_path).as_posix()
                    
                    # Skip excluded files
                    if exclude_patterns and any(
                        fnmatch.fnmatch(relative_path, pattern)
                        for pattern in exclude_patterns
                    ):
                        continue
                    
                    # Add file to archive
                    zipf.write(file_path, arcname=relative_path)
                    result["created_files"].append(relative_path)
            
            result["success"] = True
            result["message"] = f"Successfully created ZIP archive with {len(result['created_files'])} files."
            result["files_count"] = len(result["created_files"])
            
    except Exception as e:
        result["error"] = f"Failed to create ZIP archive: {str(e)}"
    
    return result