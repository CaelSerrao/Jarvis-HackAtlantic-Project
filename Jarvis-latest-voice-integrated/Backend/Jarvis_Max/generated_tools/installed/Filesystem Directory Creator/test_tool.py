# Copyright (c) Jarvis Tool Builder
# Licensed under the MIT License

import os
import tempfile
import unittest
from tool import create_directories


class TestCreateDirectories(unittest.TestCase):
    def setUp(self):
        # Create a temporary directory for testing
        self.test_dir = tempfile.mkdtemp()
        self.original_cwd = os.getcwd()
        os.chdir(self.test_dir)

    def tearDown(self):
        # Clean up and restore original directory
        os.chdir(self.original_cwd)
        for root, dirs, files in os.walk(self.test_dir, topdown=False):
            for name in files:
                os.remove(os.path.join(root, name))
            for name in dirs:
                os.rmdir(os.path.join(root, name))
        os.rmdir(self.test_dir)

    def test_create_single_directory(self):
        result = create_directories("test_dir")
        self.assertTrue(result["success"])
        self.assertEqual(len(result["created_paths"]), 1)
        self.assertEqual(result["created_paths"][0], os.path.join(self.test_dir, "test_dir"))
        self.assertEqual(len(result["errors"]), 0)
        self.assertTrue(os.path.exists(os.path.join(self.test_dir, "test_dir")))

    def test_create_multiple_directories(self):
        result = create_directories(["dir1", "dir2/subdir"])
        self.assertTrue(result["success"])
        self.assertEqual(len(result["created_paths"]), 2)
        self.assertEqual(len(result["errors"]), 0)
        self.assertTrue(os.path.exists(os.path.join(self.test_dir, "dir1")))
        self.assertTrue(os.path.exists(os.path.join(self.test_dir, "dir2/subdir")))

    def test_create_directory_with_parent_path(self):
        parent_path = os.path.join(self.test_dir, "parent")
        os.makedirs(parent_path, exist_ok=True)
        result = create_directories("child_dir", parent_path=parent_path)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["created_paths"]), 1)
        self.assertEqual(result["created_paths"][0], os.path.join(parent_path, "child_dir"))
        self.assertTrue(os.path.exists(os.path.join(parent_path, "child_dir")))

    def test_create_nonexistent_parent_directory(self):
        result = create_directories("nonexistent_dir", parent_path="nonexistent_parent")
        self.assertFalse(result["success"])
        self.assertEqual(len(result["errors"]), 1)

    def test_create_existing_directory(self):
        existing_dir = os.path.join(self.test_dir, "existing_dir")
        os.makedirs(existing_dir, exist_ok=True)
        result = create_directories(existing_dir)
        self.assertTrue(result["success"])
        self.assertEqual(len(result["created_paths"]), 1)
        self.assertEqual(result["created_paths"][0], existing_dir)
        self.assertEqual(len(result["errors"]), 0)


if __name__ == "__main__":
    unittest.main()