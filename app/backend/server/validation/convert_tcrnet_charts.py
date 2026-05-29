#!/usr/bin/env python3
"""
Преобразует TCRNet HTML графики в формат TCREMP.

TCRNet: div без style, width/height в layout JSON
TCREMP: div с style="width:1100px; height:760px;", width/height не в layout
"""

import re
import sys
from pathlib import Path


def convert_content(html: str) -> str:
    """Конвертирует HTML из TCRNet формата в TCREMP формат."""
    result = html

    # 1. Найти div с id="plot-..." и добавить style
    result = re.sub(
        r'<div id="(plot-[^"]+)"></div>',
        r'<div id="\1" style="width:1100px; height:760px;"></div>',
        result
    )

    # 2. Найти layout объект и удалить width/height, обнулить margin
    # Более безопасный подход - найти "width": 1100 и "height": 760 в layout
    result = re.sub(r'"width":\s*1100,\s*', '', result)
    result = re.sub(r'"height":\s*760,\s*', '', result)

    # 3. Обнулить margin
    result = re.sub(
        r'"margin":\s*\{[^}]*?\}',
        r'"margin": {"l": 0, "r": 0, "t": 0, "b": 0}',
        result
    )

    return result


def convert_file(input_path: Path) -> None:
    """Преобразует один файл."""
    print(f"Converting: {input_path.name}", end=" ... ")

    try:
        content = input_path.read_text(encoding='utf-8')
        converted = convert_content(content)
        input_path.write_text(converted, encoding='utf-8')
        print("✓")
    except Exception as e:
        print(f"✗ Error: {e}")


def main():
    if len(sys.argv) < 2:
        print("Usage: python3 convert_tcrnet_charts.py <tcrnet-directory>")
        sys.exit(1)

    tcrnet_dir = Path(sys.argv[1])

    if not tcrnet_dir.is_dir():
        print(f"Error: {tcrnet_dir} is not a directory")
        sys.exit(1)

    html_files = list(tcrnet_dir.glob("*.html"))

    if not html_files:
        print(f"No HTML files found in {tcrnet_dir}")
        sys.exit(1)

    print(f"Found {len(html_files)} HTML files\n")

    for file in sorted(html_files):
        convert_file(file)

    print(f"\n✓ Converted {len(html_files)} files")


if __name__ == "__main__":
    main()
