import json
import re
import sys
import os


def remove_tashkeel(text: str) -> str:
    tashkeel_pattern = re.compile(r'[\u0610-\u061A\u064B-\u065F\u0670\u06D6-\u06ED]')
    return re.sub(tashkeel_pattern, '', text)


def normalize_arabic(text: str) -> str:
    text = remove_tashkeel(text)

    text = text.replace("أ", "ا")
    text = text.replace("إ", "ا")
    text = text.replace("آ", "ا")
    text = text.replace("ٱ", "ا")

    text = text.replace("ى", "ي")
    text = text.replace("ؤ", "و")
    text = text.replace("ئ", "ي")

    text = text.replace("علي", "على")

    return text


def text_with_dots(text: str) -> str:
    text = normalize_arabic(text)

    text = text.replace("*", "")
    text = text.replace("\n", " ")

    text = re.sub(r'[،,:؛!؟"\'()\[\]{}«»]', ' ', text)

    words = re.findall(r'[\u0600-\u06FF0-9]+', text)

    result = []
    for word in words:
        result.append(word)
        result.append("....")

    return " ".join(result)


def extract_text(item):
    return (
        item.get("content", {}).get("ar")
        or item.get("zekr")
        or item.get("text")
        or ""
    ).strip()


def convert_json_to_txt(json_file: str, output_file: str):
    with open(json_file, "r", encoding="utf-8") as f:
        data = json.load(f)

    items = data.get("items", [])

    output_lines = []

    for item in items:
        zekr = extract_text(item)

        if not zekr:
            continue

        cleaned_text = text_with_dots(zekr)

        output_lines.append(cleaned_text)
        output_lines.append("\n--------------------\n")

    with open(output_file, "w", encoding="utf-8") as f:
        f.write("\n".join(output_lines))

    print(f"✔ تم إنشاء: {output_file}")


def process_folder(folder_path: str):
    for root, dirs, files in os.walk(folder_path):
        for file in files:
            if file.endswith(".json") and not file.startswith("_"):
                json_path = os.path.join(root, file)

                md_folder = os.path.join(root, "md")
                os.makedirs(md_folder, exist_ok=True)

                output_path = os.path.join(
                    md_folder,
                    file.replace(".json", ".md")
                )

                try:
                    convert_json_to_txt(json_path, output_path)
                except Exception as e:
                    print(f"✖ خطأ في {json_path}: {e}")


if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("Usage: python script.py folder_path")
        sys.exit(1)

    folder = sys.argv[1]

    print(f"🔍 معالجة المجلد: {folder}")
    process_folder(folder)
    print("✅ انتهى التحويل")