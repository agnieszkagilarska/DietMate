import os
from typing import Generator, Optional
import groq
from immutables import Map
from pymongo import collection
from bs4 import BeautifulSoup
import requests

from .prompts import DietPrompter

def ask_gpt(
    message: str, 
    original_language: str, 
    client: groq.Client, 
    collectionGPT: collection.Collection,
    session_id: str,
    file_name: Optional[str] = None, 
    file_content: Optional[str] = None,
    flags: Map = Map()
) -> Generator[str, None, None]:
    """
    Sends a message to GPT and yields responses.

    :param message: The user's message to process.
    :param original_language: The language of the original message.
    :param client: The Groq client instance for sending requests.
    :param file_name: Optional file name to include in the request context.
    :param file_content: Optional file content to include in the request context.
    :param flags: Optional flags to modify behavior or apply specific rules.
    :return: A generator yielding strings as responses.
    """

    flags = flags or Map()

    rule_types: dict[str, str] = {
        "gp": "general_principles",
        "sr": "security_rules",
        "cr": "coding_rules",
    }

    system_message: str = "***SYSTEM RULES***\n"
    for flag, rule_type in rule_types.items():
        if flags.get(flag, True):
            system_message += DietPrompter.get_rules(rule_type)

    system_message += "***PREVIOUS CONVERSATION HISTORY***:\n"
    system_message += DietPrompter.get_latest_records(collectionGPT, session_id)

    user_message: str = (
        "***USER MESSAGE***:\n"
        + DietPrompter.get_user_message(message, original_language)
        + DietPrompter.get_file_content(file_name, file_content)
    )
    
    model: str = os.getenv("GROQ_GPT_MODEL", "llama-3.3-70b-versatile")

    try:
        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.3,
            max_tokens=8000,
            top_p=0.5,
            stream=True,
            stop=None
        )
        for chunk in completion:
            yield chunk.choices[0].delta.content or ""

    except groq.RateLimitError:
        yield "***ERROR***: Rate limit exceeded. Please try again later."
    except Exception as e:
        yield f"***ERROR***: Unable to process request: {str(e)}"


def gpt_search(query: str, client, original_language, flags: dict = None,):
    flags = flags or Map()

    API_KEY = os.getenv("GOOGLE_API_KEY")
    CX = os.getenv("GOOGLE_CX")

    if not query:
        yield "***ERROR***: No query provided"
        return
    
    user_message: str = (
        "***USER MESSAGE***:\n"
        + DietPrompter.get_user_message(query, original_language)
    )

    rule_types: dict[str, str] = {
        "gp": "general_principles",
        "sr": "security_rules",
        "sh": "search_rules",
    }
    system_message: str = "***SYSTEM RULES***\n"
    for flag, rule_type in rule_types.items():
        if flags.get(flag, True):
            system_message += DietPrompter.get_rules(rule_type)
    
    system_message += "***SEARCH RESULTS***:\n"

    search_url = f"https://www.googleapis.com/customsearch/v1?q={query}&key={API_KEY}&cx={CX}&num=1"

    try:
        response = requests.get(search_url)
        search_data = response.json()

        if "error" in search_data:
            yield f"***ERROR***: {search_data['error']['message']}"
            return

        url = search_data.get("items", [{}])[0].get("link")

        if not url:
            yield "***ERROR***: No results found"
            return

    except Exception as e:
        yield f"***ERROR***: {str(e)}"
        return

    try:
        response = requests.get(url, timeout=5)
        if response.status_code != 200:
            yield f"***ERROR***: Could not find the requested webpage"
            return

        soup = BeautifulSoup(response.text, 'html.parser')
        for script in soup(["script", "style"]):
            script.extract()
        text = soup.get_text(separator=' ', strip=True)

        MAX_CHARS = 5000
        text = text[:MAX_CHARS]

        system_message += text

        model = os.getenv("GROQ_GPT_MODEL", "llama-3.3-70b-versatile")

        completion = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": system_message},
                {"role": "user", "content": user_message}
            ],
            temperature=0.0,
            max_tokens=500,
            top_p=0.1,
            stream=True,
            stop=None
        )

        for chunk in completion:
            yield chunk.choices[0].delta.content or ""

    except requests.exceptions.Timeout:
        yield f"***ERROR***: Request timed out for {url}"
    except requests.exceptions.RequestException as e:
        yield f"***ERROR***: {str(e)}"
    except Exception as e:
        yield f"***ERROR***: {str(e)}"

    yield f"\n---\n🔗 {url}"