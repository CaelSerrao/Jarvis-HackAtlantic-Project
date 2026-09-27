# Copyright © 2023 Jarvis Tool Builder
# Licensed under the MIT License.

"""
Tests for the create_zip_archive tool.
"""

import json
import os
import tempfile
import unittest
from pathlib import Path
from zipfile import ZIP_DEFLATED, ZipFile
from tool import create_zip_archive


class TestCreateZipArchiveTool(unittest.TestCase):
    def setUp(self):
        """Set up a temporary directory for testing."""
        self.temp_dir = tempfile.TemporaryDirectory()
        self.root = Path(self.temp_dir.name)
        
        # Create a sample directory structure
        self.source_dir = self.root / "source"
        self.source_dir.mkdir()
        
        # Create some test files
        (self.source_dir / "file1.txt").write_text("Test content 1")
        (self.source_dir / "subdir").mkdir()
        (self.source_dir / "subdir" / "file2.txt").write_text("Test content 2")
        (self.source_dir / "hidden_file.txt").write_text("Hidden content")
        
        # Create destination directory
        self.dest_dir = self.root / "dest"
        self.dest_dir.mkdir()

    def tearDown(self):
        """Clean up the temporary directory."""
        self.temp_dir.cleanup()

    def test_successful_zip_creation(self):
        """Test successful creation of a ZIP archive."""
        source_path = str(self.source_dir)
        destination_path = str(self.dest_dir / "archive.zip")
        
        result = create_zip_archive(source_path, destination_path)
        
        self.assertTrue(result["success"], msg=f"Expected success but got: {result}")
        self.assertEqual(result["files_count"], 3)
        self.assertEqual(len(result["created_files"]), 3)
        self.assertIn("file1.txt", result["created_files"])
        self.assertIn("subdir/file2.txt", result["created_files"])
        
        # Verify the ZIP file was created and contains expected files
        with ZipFile(destination_path, "r") as zipf:
            self.assertEqual(len(zipf.namelist()), 3)
            self.assertIn("file1.txt", zipf.namelist())
            self.assertIn("subdir/file2.txt", zipf.namelist())

    def test_zip_creation_with_exclude_patterns(self):
        """Test ZIP creation with exclusion patterns."""
        source_path = str(self.source_dir)
        destination_path = str(self.dest_dir / "archive_excluded.zip")
        
        result = create_zip_archive(
            source_path,
            destination_path,
            exclude_patterns=["*hidden*"]
        )
        
        self.assertTrue(result["success"], msg=f"Expected success but got: {result}")
        self.assertEqual(result["files_count"], 2)
        self.assertEqual(len(result["created_files"]), 2)
        self.assertNotIn("hidden_file.txt", result["created_files"])
        
        # Verify the ZIP file does not contain the excluded file
        with ZipFile(destination_path, "r") as zipf:
            self.assertEqual(len(zipf.namelist()), 2)
            self.assertNotIn("hidden_file.txt", zipf.namelist())

    def test_invalid_source_path(self):
        """Test handling of invalid source path."""
        source_path = str(self.source_dir / "nonexistent")
        destination_path = str(self.dest_dir / "invalid.zip")
        
        result = create_zip_archive(source_path, destination_path)
        
        self.assertFalse(result["success"], msg=f"Expected failure but got: {result}")
        self.assertIn("Source path", result["error"])

    def test_invalid_destination_parent(self):
        """Test handling of invalid destination parent."""
        source_path = str(self.source_dir)
        destination_path = str(self.root / "invalid_parent" / "archive.zip")
        
        result = create_zip_archive(source_path, destination_path)
        
        self.assertFalse(result["success"], msg=f"Expected failure but got: {result}")
        self.assertIn("Destination parent directory", result["error"])

    def test_stored_compression(self):
        """Test ZIP creation with stored compression."""
        source_path = str(self.source_dir)
        destination_path = str(self.dest_dir / "archive_stored.zip")
        
        result = create_zip_archive(
            source_path,
            destination_path,
            compression="stored"
        )
        
        self.assertTrue(result["success"], msg=f"Expected success but got: {result}")
        self.assertEqual(result["files_count"], 3)
        
        # Verify the ZIP file was created with stored compression
        with ZipFile(destination_path, "r") as zipf:
            self.assertEqual(len(zipf.namelist()), 3)

    def test_empty_source_directory(self):
        """Test ZIP creation with an empty source directory."""
        empty_dir = self.root / "empty"
        empty_dir.mkdir()
        
        source_path = str(empty_dir)
        destination_path = str(self.dest_dir / "empty_archive.zip")
        
        result = create_zip_archive(source_path, destination_path)
        
        self.assertTrue(result["success"], msg=f"Expected success but got: {result}")
        self.assertEqual(result["files_count"], 0)
        self.assertEqual(len(result["created_files"]), 0)
        
        # Verify the ZIP file is created but empty
        with ZipFile(destination_path, "r") as zipf:
            self.assertEqual(len(zipf.namelist()), 0)


if __name__ == "__main__":
    unittest.main()