"""
Dataset download script for Aivon DSA Platform.
Downloads ALL fields from newfacade/LeetCodeDataset on HuggingFace.
Usage: python3 data/scripts/download.py
"""

import json
import os
import sys


def download_dataset():
    try:
        from datasets import load_dataset
    except ImportError:
        print("Installing 'datasets' library...")
        os.system(f"{sys.executable} -m pip install datasets")
        from datasets import load_dataset

    print("📥 Downloading newfacade/LeetCodeDataset from HuggingFace...")
    dataset = load_dataset("newfacade/LeetCodeDataset", split="train")

    print(f"   Found {len(dataset)} problems.")
    print(f"   Fields: {dataset.column_names}")

    os.makedirs("data/raw", exist_ok=True)
    output_path = "data/raw/leetcode_dataset.json"

    records = []
    for item in dataset:
        records.append({
            # Core identifiers
            "task_id":             item.get("task_id"),
            "question_id":         item.get("question_id"),

            # Problem content
            "difficulty":          item.get("difficulty"),
            "tags":                item.get("tags", []),
            "problem_description": item.get("problem_description"),
            "constraints":         item.get("constraints", ""),

            # Code scaffolding
            "starter_code":        item.get("starter_code"),
            "entry_point":         item.get("entry_point"),

            # Test data (critical for execution)
            "input_output":        item.get("input_output", []),   # [{input, output}] structured list
            "test":                item.get("test", ""),            # raw test code string

            # AI features — store privately, never expose to frontend
            "prompt":              item.get("prompt", ""),          # instruction prompt
            "completion":          item.get("completion", ""),      # reference solution
            "query":               item.get("query", ""),           # problem query form
            "response":            item.get("response", ""),        # expert response

            # Metadata
            "estimated_date":      str(item.get("estimated_date", "")),
        })

    with open(output_path, "w") as f:
        json.dump(records, f, indent=2, default=str)

    print(f"✅ Saved {len(records)} problems to {output_path}")
    print(f"   File size: {os.path.getsize(output_path) / 1024 / 1024:.1f} MB")


if __name__ == "__main__":
    download_dataset()
