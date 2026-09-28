# Copyright (c) Jarvis Tool Builder Agent
# Licensed under the MIT License

import os
import json
import tempfile
from pathlib import Path
from tool import create_text_file


def test_create_text_file():
    """Test cases for create_text_file function."""
    
    # Test 1: Create a file in a temporary directory
    with tempfile.TemporaryDirectory() as temp_dir:
        test_path = os.path.join(temp_dir, "test_file.txt")
        content = "Hello, World!"
        result = create_text_file(test_path, content)
        
        assert result["success"] is True
        assert result["file_path"] == test_path
        assert result["error"] is None
        
        # Verify file content
        with open(test_path, "r", encoding="utf-8") as file:
            assert file.read() == content
        
    # Test 2: Overwrite existing file
    with tempfile.TemporaryDirectory() as temp_dir:
        test_path = os.path.join(temp_dir, "test_overwrite.txt")
        
        # Create initial file
        with open(test_path, "w") as file:
            file.write("Initial content")
        
        # Overwrite with new content
        new_content = "Overwritten content"
        result = create_text_file(test_path, new_content, overwrite=True)
        
        assert result["success"] is True
        
        # Verify overwritten content
        with open(test_path, "r", encoding="utf-8") as file:
            assert file.read() == new_content
        
    # Test 3: Fail to overwrite existing file
    with tempfile.TemporaryDirectory() as temp_dir:
        test_path = os.path.join(temp_dir, "test_no_overwrite.txt")
        
        # Create initial file
        with open(test_path, "w") as file:
            file.write("Initial content")
        
        # Attempt to create without overwriting
        result = create_text_file(test_path, "New content", overwrite=False)
        
        assert result["success"] is False
        assert result["error"] == f"File '{test_path}' already exists and overwrite=False."
        
    # Test 4: Create nested directory structure
    with tempfile.TemporaryDirectory() as temp_dir:
        nested_path = os.path.join(temp_dir, "subdir", "nested", "file.txt")
        content = "Nested file content"
        result = create_text_file(nested_path, content)
        
        assert result["success"] is True
        assert Path(nested_path).exists()
        
        # Verify content
        with open(nested_path, "r", encoding="utf-8") as file:
            assert file.read() == content
        
    print("All tests passed!")


if __name__ == "__main__":
    test_create_text_file()