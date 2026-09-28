# Copyright (c) Jarvis Tool Builder
# Licensed under the MIT License

import os
import json
from pathlib import Path
from typing import Union, List

def create_directories(directory_paths: Union[str, List[str]], parent_path: str = None) -> dict:
    """
    Creates directories at user-specified filesystem locations.
    
    Args:
        directory_paths (str or List[str]): Path(s) of the directory(ies) to create.
            If a string, it is treated as a single directory path.
            If a list, each string is treated as a separate directory path.
        parent_path (str, optional): Parent directory path where the directories will be created.
            If None, directories are created relative to the current working directory.
            Defaults to None.
    
    Returns:
        dict: A JSON-compatible dictionary containing:
            - success (bool): Whether the operation was successful.
            - created_paths (List[str]): List of **absolute paths** of successfully created directories.
            - errors (List[str]): List of error messages for failed directories.
    """
    # Convert single string input to a list for uniform processing
    if isinstance(directory_paths, str):
        directory_paths = [directory_paths]
    
    created_paths = []
    errors = []
    
    for path in directory_paths:
        try:
            # Resolve the full path for creation (absolute or relative to parent)
            if parent_path:
                full_path = os.path.normpath(os.path.join(parent_path, path))
                # Check if parent_path exists
                if not os.path.exists(parent_path):
                    raise FileNotFoundError(f"Parent directory '{parent_path}' does not exist")
                # Store the absolute path of the created directory
                created_paths.append(full_path)
            else:
                # Store the absolute path of the created directory
                full_path = os.path.normpath(os.path.join(os.getcwd(), path))
                created_paths.append(full_path)
            
            # Create the directory (including parent directories if needed)
            os.makedirs(full_path, exist_ok=True)
            
        except Exception as e:
            errors.append(f"Failed to create directory '{path}': {str(e)}")
    
    return {
        "success": len(errors) == 0,
        "created_paths": created_paths,
        "errors": errors
    }