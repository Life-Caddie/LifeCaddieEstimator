import os
import base64
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv()

client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))


def create_file(file_path: str) -> str:
    """Use openAI 'files' API to create a file ID.

    :param file_path: Path to desired image
    :type file_path: str
    :returns: The image ID
    :rtype: str
    """
    with open(file_path, "rb") as file_content:
        result = client.files.create(
            file=file_content,
            purpose="vision",
        )
        return result.id


def build_file(md_path: str) -> str:
    """Encode a markdown file to utf-8 for reading

    :param md_path: Path to desired image.
    :type md_path: str
    :returns: The context markdown file path.
    :rtype: str
    """
    try:
        with open("src/context.md", "r", encoding="utf-8") as f:
            context_content = f.read()
        return context_content
    except Exception as e:
        print(f"Error reading file: {e}")
        return ""


def identify_items():
    print("SERVICE: Begin context gathering...")

    context_readable = build_file("src/context.md")
    print("SERVICE: Cleaned markdown file!")

    image = create_file("src/assets/girls-bedroom-example.jpg")
    print("SERVICE: Uploaded image file!")

    print("SERVICE: Begin LLM call...")
    response = client.responses.create(
        model="gpt-5",
        input=[
            {
                "role": "developer",
                "content": [
                    {"type": "input_text", "text": "Read the provided context file to understand your role."},
                    {"type": "input_text", "text": context_readable},
                ],
            },
            {
                "role": "user",
                "content": [
                    {"type": "input_text", "text": "Here is the image of the space."},
                    {"type": "input_image", "detail": "auto", "file_id": image}
                ]
            }
        ],
    )
    return response.output_text


if __name__ == "__main__":
    print("SERVICE: Running identify_items...")
    print("___________________________")
    answer = identify_items()

    print("SERVICE: Done!.!")
    print("___________________________ Answer: \n")
    print(answer)


""" Steps Needed
1) Scan for items that need to be moved
    * Convert the image into something the LLM can process
    - Have LLM identify items that need moving (using large context message)
    - Collect the output as a string containing all the things that need moving
2) Calculate price per item + difficulty of moving each item
    - Using the previous query output...
    - Use base 'price-per-item' then optimize using LLM discresion on 'move difficulty'
3) Return the result as a string containing the commulative price *and duration*
"""
