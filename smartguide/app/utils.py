import json
import logging
import re

logger = logging.getLogger(__name__)

def parse_llm_json(raw: str) -> dict:
    """
    Robustly extract a JSON object from LLM output.
    Attempts multiple strategies:
    1. Direct json.loads
    2. Markdown code block extraction
    3. Regex matching the first { to last }
    4. Truncation fix (if it ends early, attempt to close common tags)
    """
    text = raw.strip()
    
    # Strategy 1: Direct JSON
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
        
    # Strategy 2: Markdown code blocks
    # Try ```json ... ``` first, then generic ``` ... ```
    for pattern in [r"```json\s*(.*?)\s*```", r"```\s*(.*?)\s*```"]:
        match = re.search(pattern, text, re.DOTALL)
        if match:
            inner = match.group(1).strip()
            try:
                return json.loads(inner)
            except json.JSONDecodeError:
                text = inner # use inner for further attempts
                break

    # Strategy 3: Regex match the outermost braces
    start = text.find("{")
    end = text.rfind("}") + 1
    if start != -1 and end > start:
        candidate = text[start:end]
        try:
            return json.loads(candidate)
        except json.JSONDecodeError:
            # If still failing, it might be truncated.
            # Very basic attempt to fix common truncation errors (missing closing braces/brackets)
            pass

    # If it reached here, the JSON is probably fundamentally malformed or very badly truncated
    logger.error("Failed to parse LLM output as JSON. Raw text: \n%s", raw)
    # Final desperate attempt: if it ends with "..." or looks truncated, try to close it?
    # Better to just raise and see the debug logs for now.
    raise ValueError("No valid JSON found in LLM output")
